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
const { notifyOnboardingPendingReview } = require('../../../services/superAdminAlertService');
const { resolveExpertShare, toExpertNet } = require('../../shared/compensation');

const OFFER_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const AUTO_DECLINE_REASON = 'Auto-declined: the expert did not respond to the offer letter within 3 days.';

const TRAINING_MODE_LABELS = { remote: 'Online (Remote)', hybrid: 'Hybrid', on_site: 'On-site (In-person)' };

/**
 * Fees payable to the Trainer are the expert's NET amount (after the platform margin),
 * never the institution's gross budget. Derive from the accurate stored total budget
 * (not qty * rounded per-unit rate, which can drift by a few rupees from rounding).
 */
function computeTotalFee(application, project) {
  const expertShare = resolveExpertShare(project);
  const grossTotal =
    Number(project?.institution_gross_total) > 0
      ? Number(project.institution_gross_total)
      : Number(project?.total_budget) > 0
        ? Number(project.total_budget)
        : 0;
  if (grossTotal > 0) {
    return toExpertNet(grossTotal, expertShare) ?? undefined;
  }

  // Fallback for legacy rows without a stored total: derive from per-unit rate * quantity.
  const netPerUnit = Number(application?.final_net_per_unit);
  const unitQuantity = Number(application?.unit_quantity ?? project?.unit_quantity ?? 1);
  const qty = Number.isFinite(unitQuantity) && unitQuantity > 0 ? unitQuantity : 1;
  if (Number.isFinite(netPerUnit) && netPerUnit > 0) {
    return Math.round(netPerUnit * qty);
  }
  const grossPerUnit = Number(application?.final_gross_per_unit ?? project?.institution_gross_per_unit ?? project?.hourly_rate);
  if (!Number.isFinite(grossPerUnit) || grossPerUnit <= 0) return undefined;
  return toExpertNet(grossPerUnit * qty, expertShare) ?? undefined;
}

function describeTrainingDuration(project) {
  const p = project || {};
  const hours = Number(p.duration_hours);
  const perDay = Number(p.hours_per_day);
  const qty = Number(p.unit_quantity);
  const perUnit = Number(p.duration_per_unit);
  if (qty > 0 && p.compensation_unit === 'per_session' && perUnit > 0) {
    return `${qty} session${qty > 1 ? 's' : ''} of ${perUnit} hour${perUnit > 1 ? 's' : ''} each`;
  }
  if (Number.isFinite(hours) && hours > 0 && Number.isFinite(perDay) && perDay > 0) {
    const days = hours / perDay;
    if (days >= 5) {
      const weeks = Math.round((days / 5) * 10) / 10;
      return `${weeks} week${weeks > 1 ? 's' : ''} (${hours} hours)`;
    }
    return `${Math.round(days * 10) / 10} day${days > 1 ? 's' : ''} (${hours} hours)`;
  }
  if (Number.isFinite(hours) && hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (p.start_date && p.end_date) return `${p.start_date} to ${p.end_date}`;
  return undefined;
}

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

    const created = await this.repo.create({
      application_id: applicationId,
      booking_id: bookingId || null,
      project_id: projectId,
      expert_id: expertId,
      institution_id: institutionId,
      status: 'pending_review',
    });
    notifyOnboardingPendingReview(this.db).catch(() => {});
    return created;
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

    const totalFee = computeTotalFee(application, project);
    const milestone1Percent = 50;
    const milestone1Amount = totalFee != null ? Math.round((totalFee * milestone1Percent) / 100) : undefined;
    const milestone2Percent = 50;
    const milestone2Amount = totalFee != null ? Math.round((totalFee * milestone2Percent) / 100) : undefined;

    const html = buildOfferLetterHtml({
      expertName: expert?.name,
      expertAddress: expert?.address,
      referenceNo: `CALX/${sentAt.getFullYear()}/${String(request.application_id).slice(0, 8).toUpperCase()}`,
      letterDate: sentAt.toISOString(),
      engagementRole: project?.title,
      courseTitle: project?.title,
      trainingMode: TRAINING_MODE_LABELS[project?.workplace_type] || project?.workplace_type,
      totalSessions: application?.unit_quantity ?? project?.unit_quantity,
      trainingDuration: describeTrainingDuration(project),
      startDate: project?.start_date,
      totalFee,
      milestone1Percent,
      milestone1Amount,
      milestone2Percent,
      milestone2Amount,
      paymentDays: 15,
      noticePeriodDays: 15,
      nonSolicitationMonths: 12,
      ipSurvivalYears: 3,
      jurisdictionCity: 'Gurugram',
      jurisdictionState: 'Haryana',
      documentTitle: 'TRAINER ENGAGEMENT LETTER',
      institutionName: institution?.name,
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

    try {
      await this.repo.rejectApplication(request.application_id);
    } catch (err) {
      console.warn('Failed to revert application status for declined onboarding request:', err.message || err);
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
