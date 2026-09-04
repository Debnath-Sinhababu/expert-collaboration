const OnboardingRepository = require('./onboarding.repository');
const { generateOfferLetterPdf } = require('../../../services/offerLetterPdfService');
const ImageUploadService = require('../../../services/imageUploadService');
const {
  sendOfferLetterEmail,
  sendOfferDeclinedEmail,
  sendOnboardingDeclinedToInstitutionEmail,
  sendOnboardingAcceptedToAdminEmail,
} = require('../../../services/offerLetterEmailService');
const { notifyOnboardingPendingReview } = require('../../../services/superAdminAlertService');
const { resolveExpertShare, toExpertNet, buildOfferLetterProgramDetails } = require('../../shared/compensation');
const { normalizePaymentTerm } = require('../../../services/offerLetterContent');
const { buildOfferLetterHtml } = require('../../../services/offerLetterTemplate');

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

/** Shared letter payload for PDF generation, HTML preview, and stored offer_letter_data. */
function buildOfferLetterData({
  application,
  project,
  expert,
  institution,
  applicationId,
  paymentTerm,
  letterDate = new Date(),
  referenceNo,
}) {
  const sentAt = letterDate instanceof Date ? letterDate : new Date(letterDate);
  const totalFee = computeTotalFee(application, project);
  const normalizedTerm = normalizePaymentTerm(paymentTerm);
  const milestone1Percent = 50;
  const milestone1Amount = totalFee != null ? Math.round((totalFee * milestone1Percent) / 100) : undefined;
  const milestone2Percent = 50;
  const milestone2Amount = totalFee != null ? Math.round((totalFee * milestone2Percent) / 100) : undefined;

  const ref = referenceNo
    || `CLX/HR/ENG/${String(applicationId).slice(0, 8).toUpperCase()}/${sentAt.getFullYear()}`;

  const programDetails = buildOfferLetterProgramDetails(application, project);

  return {
    expertName: expert?.name,
    expertAddress: expert?.address,
    referenceNo: ref,
    letterDate: sentAt.toISOString(),
    engagementRole: project?.title,
    courseTitle: project?.title,
    trainingMode: TRAINING_MODE_LABELS[project?.workplace_type] || project?.workplace_type,
    ...programDetails,
    startDate: project?.start_date,
    endDate: project?.end_date,
    totalFee,
    paymentTerm: normalizedTerm,
    milestone1Percent,
    milestone1Amount,
    milestone2Percent,
    milestone2Amount,
    paymentDays: 7,
    noticePeriodDays: 7,
    nonSolicitationMonths: 12,
    ipSurvivalYears: 5,
    forceMajeureDays: 30,
    disputeResolutionDays: 30,
    rescheduleNoticeHours: 48,
    jurisdictionCity: 'Gurugram',
    jurisdictionState: 'Haryana',
    documentTitle: 'TRAINER ENGAGEMENT LETTER',
    institutionName: institution?.name,
  };
}

async function loadApplicationLetterContext(db, applicationId) {
  const { data: application, error: appErr } = await db
    .from('applications')
    .select(`
      *,
      projects (
        id, institution_id, unique_code, title, description, type, start_date, end_date,
        duration_hours, duration_per_unit, hours_per_day, workplace_type,
        required_expertise, domain_expertise, subskills,
        compensation_unit, unit_quantity, hourly_rate, total_budget,
        institution_gross_per_unit, institution_gross_total, margin_percent
      ),
      experts (
        id, name, email, phone, user_id, bio, photo_url, address,
        experience_years, qualifications, domain_expertise,
        hourly_rate, is_verified, kyc_status, rating, total_ratings, linkedin_url
      )
    `)
    .eq('id', applicationId)
    .maybeSingle();
  if (appErr) throw appErr;
  if (!application) {
    const err = new Error('Application not found');
    err.status = 404;
    throw err;
  }

  const project = application.projects;
  const expert = application.experts;
  if (!project?.institution_id) {
    const err = new Error('Project institution not found');
    err.status = 404;
    throw err;
  }

  const { data: institution, error: instErr } = await db
    .from('institutions')
    .select('id, name, email, phone, user_id, type, description, logo_url, website_url, address, city, state, country, contact_person')
    .eq('id', project.institution_id)
    .maybeSingle();
  if (instErr) throw instErr;

  return { application, project, expert, institution };
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
  async createRequest({ applicationId, bookingId, projectId, expertId, institutionId, isSuperAdminActor = false }) {
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
    // A super admin locking the rate themselves is about to auto-verify this request
    // (see applicationRate.service.js) — no need to alert admins about their own action.
    if (!isSuperAdminActor) {
      notifyOnboardingPendingReview(this.db).catch(() => {});
    }
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

  /** Draft HTML preview before an onboarding request exists (super-admin onboard flow). */
  async previewOfferLetterForApplication(applicationId, paymentTerm) {
    const ctx = await loadApplicationLetterContext(this.db, applicationId);
    const letterData = buildOfferLetterData({
      ...ctx,
      applicationId,
      paymentTerm,
      referenceNo: `CLX/HR/ENG/${String(applicationId).slice(0, 8).toUpperCase()}/DRAFT`,
    });
    return { html: buildOfferLetterHtml(letterData), letterData };
  }

  async verifyAndSendOfferLetter(id, adminUserId, options = {}) {
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

    const letterData = buildOfferLetterData({
      application,
      project,
      expert,
      institution,
      applicationId: request.application_id,
      paymentTerm: options.paymentTerm,
      letterDate: sentAt,
    });

    const pdfBuffer = await generateOfferLetterPdf(letterData);
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
      // Kept so the expert-facing preview can render the same content as real scrollable HTML
      // (rather than trying to track scroll inside a native/cross-origin PDF viewer).
      offer_letter_data: letterData,
    });

    try {
      await sendOfferLetterEmail({
        to: expert.email,
        expertName: expert.name,
        institutionName: institution?.name,
        projectTitle: project?.title,
      });
    } catch (err) {
      console.warn('sendOfferLetterEmail failed:', err.message || err);
    }

    return updated;
  }

  /**
   * The expert electronically executes the letter (Clause 19) by typing their name and the
   * date. A signed copy of the same letter is rendered and stored, then sent only to the
   * super admins (institution is not emailed on accept).
   */
  async acceptOffer(id, expertId, { signatureName, signatureDate } = {}) {
    const request = await this.repo.getById(id);
    if (!request) throw new HttpError(404, 'Onboarding request not found');
    if (String(request.expert_id) !== String(expertId)) throw new HttpError(403, 'Unauthorized');
    if (request.status !== 'offer_sent') {
      throw new HttpError(400, `Cannot accept a request in status "${request.status}"`);
    }
    if (!signatureName) {
      throw new HttpError(400, 'Type your full name as your signature to accept this offer');
    }
    if (!signatureDate) {
      throw new HttpError(400, 'A valid signature date is required to accept this offer');
    }

    const signedAt = new Date();
    const letterData = request.offer_letter_data || null;

    // Older rows predate offer_letter_data, so there is nothing to re-render a signed copy
    // from. Acceptance still succeeds — only the signed PDF is skipped.
    let signedUpload = null;
    let signedPdfBuffer = null;
    if (letterData) {
      try {
        signedPdfBuffer = await generateOfferLetterPdf({
          ...letterData,
          signature: {
            name: signatureName,
            date: signatureDate,
            signedAt: signedAt.toISOString(),
          },
        });
        const upload = await ImageUploadService.uploadPDF(
          signedPdfBuffer,
          'offer-letters',
          `offer-${request.application_id}-signed`
        );
        if (upload.success) signedUpload = upload;
        else console.warn('Signed offer letter upload failed:', upload.error);
      } catch (err) {
        console.warn('Signed offer letter generation failed:', err.message || err);
      }
    }

    const updated = await this.repo.update(id, {
      status: 'accepted',
      responded_at: signedAt.toISOString(),
      signature_name: signatureName,
      signature_date: signatureDate,
      signed_at: signedAt.toISOString(),
      ...(signedUpload
        ? {
          signed_offer_letter_url: signedUpload.url,
          signed_offer_letter_public_id: signedUpload.publicId,
        }
        : {}),
    });

    const institution = request.institutions;
    try {
      await sendOnboardingAcceptedToAdminEmail({
        expertName: request.experts?.name,
        institutionName: institution?.name,
        projectTitle: request.projects?.title,
        signatureName,
        signedAt: signedAt.toISOString(),
        signedPdfBuffer,
      });
    } catch (err) {
      console.warn('sendOnboardingAcceptedToAdminEmail failed:', err.message || err);
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
      // No `reason` — the decline reason is not disclosed to the institution.
      await sendOnboardingDeclinedToInstitutionEmail({
        to: institution?.email,
        institutionName: institution?.name,
        expertName: request.experts?.name,
        projectTitle: request.projects?.title,
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
