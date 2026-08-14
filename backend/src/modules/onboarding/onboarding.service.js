const OnboardingRepository = require('./onboarding.repository');
const { buildOfferLetterHtml } = require('../../../services/offerLetterTemplate');
const { generateOfferLetterPdf } = require('../../../services/offerLetterPdfService');
const ImageUploadService = require('../../../services/imageUploadService');
const {
  sendOfferLetterEmail,
  sendOnboardingConfirmedEmail,
  sendOfferDeclinedEmail,
  sendOnboardingDeclinedToInstitutionEmail,
} = require('../../../services/offerLetterEmailService');

const OFFER_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const AUTO_DECLINE_REASON = 'Auto-declined: the expert did not respond to the offer letter within 3 days.';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class OnboardingService {
  constructor(serviceClient, repository = null) {
    this.db = serviceClient;
    this.repo = repository || new OnboardingRepository(serviceClient);
  }

  /**
   * Called right after a booking is created for an accepted application.
   * Opens (or reuses) the onboarding review case for the super admin queue.
   */
  async createRequest({ applicationId, bookingId, projectId, expertId, institutionId }) {
    const existing = await this.repo.findActiveByApplicationId(applicationId);
    if (existing) return existing;

    return this.repo.create({
      application_id: applicationId,
      booking_id: bookingId || null,
      project_id: projectId,
      expert_id: expertId,
      institution_id: institutionId,
      status: 'pending_review',
    });
  }

  async listRequests(filters) {
    return this.repo.list(filters);
  }

  async getRequest(id) {
    const request = await this.repo.getById(id);
    if (!request) throw new HttpError(404, 'Onboarding request not found');
    return request;
  }

  async verifyAndSendOfferLetter(id, adminUserId) {
    const request = await this.repo.getById(id);
    if (!request) throw new HttpError(404, 'Onboarding request not found');
    if (request.status !== 'pending_review') {
      throw new HttpError(400, `Cannot verify a request in status "${request.status}"`);
    }

    const expert = request.experts;
    const institution = request.institutions;
    const project = request.projects;
    const application = request.applications;
    if (!expert?.email) {
      throw new HttpError(400, 'Expert has no email on file');
    }

    const sentAt = new Date();
    const expiresAt = new Date(sentAt.getTime() + OFFER_EXPIRY_MS);

    const html = buildOfferLetterHtml({
      expertName: expert?.name,
      institutionName: institution?.name,
      projectTitle: project?.title,
      grossPerUnit: application?.final_gross_per_unit,
      compensationUnit: application?.compensation_unit || project?.compensation_unit,
      startDate: project?.start_date,
      endDate: project?.end_date,
      offerDate: sentAt.toISOString(),
    });

    const pdfBuffer = await generateOfferLetterPdf(html);
    const upload = await ImageUploadService.uploadPDF(pdfBuffer, 'offer-letters', `offer-${request.application_id}`);
    if (!upload.success) {
      throw new HttpError(500, upload.error || 'Failed to upload offer letter');
    }

    const updated = await this.repo.update(id, {
      status: 'offer_sent',
      offer_letter_url: upload.url,
      offer_letter_public_id: upload.publicId,
      offer_sent_at: sentAt.toISOString(),
      offer_expires_at: expiresAt.toISOString(),
      reviewed_by: adminUserId || null,
      reviewed_at: sentAt.toISOString(),
    });

    try {
      await sendOfferLetterEmail({
        to: expert.email,
        expertName: expert.name,
        institutionName: institution?.name,
        projectTitle: project?.title,
        pdfUrl: upload.url,
      });
    } catch (err) {
      console.warn('sendOfferLetterEmail failed:', err.message || err);
    }

    return updated;
  }

  async acceptOffer(id, expertId) {
    const request = await this.repo.getById(id);
    if (!request) throw new HttpError(404, 'Onboarding request not found');
    if (String(request.expert_id) !== String(expertId)) throw new HttpError(403, 'Unauthorized');
    if (request.status !== 'offer_sent') {
      throw new HttpError(400, `Cannot accept a request in status "${request.status}"`);
    }

    const updated = await this.repo.update(id, {
      status: 'accepted',
      responded_at: new Date().toISOString(),
    });

    const institution = request.institutions;
    try {
      await sendOnboardingConfirmedEmail({
        to: institution?.email,
        institutionName: institution?.name,
        expertName: request.experts?.name,
        projectTitle: request.projects?.title,
      });
    } catch (err) {
      console.warn('sendOnboardingConfirmedEmail failed:', err.message || err);
    }

    return updated;
  }

  async declineOffer(id, expertId, reason) {
    if (!reason) throw new HttpError(400, 'A reason is required to decline the offer');
    const request = await this.repo.getById(id);
    if (!request) throw new HttpError(404, 'Onboarding request not found');
    if (String(request.expert_id) !== String(expertId)) throw new HttpError(403, 'Unauthorized');
    if (request.status !== 'offer_sent') {
      throw new HttpError(400, `Cannot decline a request in status "${request.status}"`);
    }

    return this.#finalizeDecline(request, reason, { auto: false });
  }

  /**
   * Finds offer_sent requests past their 3-day expiry and auto-declines them,
   * cancelling the associated booking and notifying the institution + admin.
   * Safe to call repeatedly (only touches rows that are still due).
   */
  async expireStaleOffers() {
    const nowIso = new Date().toISOString();
    const stale = await this.repo.listExpiredOfferSent(nowIso);
    const results = [];
    for (const request of stale) {
      try {
        results.push(await this.#finalizeDecline(request, AUTO_DECLINE_REASON, { auto: true }));
      } catch (err) {
        console.warn('Failed to auto-expire onboarding request', request.id, err.message || err);
      }
    }
    return results;
  }

  async #finalizeDecline(request, reason, { auto }) {
    const updated = await this.repo.update(request.id, {
      status: auto ? 'expired' : 'declined',
      decline_reason: reason,
      responded_at: new Date().toISOString(),
    });

    if (request.booking_id) {
      try {
        await this.repo.cancelBooking(request.booking_id);
      } catch (err) {
        console.warn('Failed to cancel booking for declined onboarding request:', err.message || err);
      }
    }

    const institution = request.institutions;
    try {
      await sendOfferDeclinedEmail({
        expertName: request.experts?.name,
        institutionName: institution?.name,
        projectTitle: request.projects?.title,
        reason,
        auto,
      });
    } catch (err) {
      console.warn('sendOfferDeclinedEmail failed:', err.message || err);
    }
    try {
      await sendOnboardingDeclinedToInstitutionEmail({
        to: institution?.email,
        institutionName: institution?.name,
        expertName: request.experts?.name,
        projectTitle: request.projects?.title,
        reason,
        auto,
      });
    } catch (err) {
      console.warn('sendOnboardingDeclinedToInstitutionEmail failed:', err.message || err);
    }

    return updated;
  }
}

module.exports = OnboardingService;
module.exports.HttpError = HttpError;
