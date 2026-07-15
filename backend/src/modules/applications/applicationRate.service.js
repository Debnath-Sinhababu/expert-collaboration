const ApplicationRateRepository = require('./applicationRate.repository');
const {
  RATE_INTENTS,
  toExpertNet,
  toInstitutionGrossFromNet,
  isRateAgreed,
  isPostedRateOfferPending,
  isPostedRateDeclined,
  isRateNegotiationClosed,
  projectPostedRates,
  appendNegotiationHistory,
  resolveBookingAmount,
} = require('../../shared/compensation');
const { parseRateIntent, parsePositiveNumber } = require('./applicationRate.dto');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class ApplicationRateService {
  constructor(serviceClient, repository = null) {
    this.db = serviceClient;
    this.repo = repository || new ApplicationRateRepository(serviceClient);
  }

  /**
   * Enrich application insert payload with rate_intent / rate_status / compensation snapshot.
   * Called from legacy POST /api/applications — keeps create path thin.
   */
  prepareCreatePayload(body, project) {
    const intent = parseRateIntent(body.rate_intent) || 'agreed_posted';
    if (!RATE_INTENTS.has(intent)) {
      throw new HttpError(400, 'rate_intent must be agreed_posted or open_to_negotiate');
    }

    const posted = projectPostedRates(project || {});
    const history = appendNegotiationHistory([], {
      actor: 'expert',
      action: intent === 'agreed_posted' ? 'agreed_posted_at_apply' : 'open_to_negotiate_at_apply',
      net_per_unit: posted.netPerUnit || null,
      gross_per_unit: posted.grossPerUnit || null,
      note: body.rate_note || null,
    });

    const patch = {
      rate_intent: intent,
      rate_status: intent,
      compensation_unit: posted.unit,
      unit_quantity: posted.quantity,
      rate_note: body.rate_note != null && String(body.rate_note).trim() !== ''
        ? String(body.rate_note).trim()
        : null,
      negotiation_history: history,
      proposed_net_per_unit: null,
      institution_counter_gross_per_unit: null,
      final_gross_per_unit: null,
      final_net_per_unit: null,
    };

    // Legacy proposed_rate: store posted gross when agreed; omit amount when negotiating.
    if (intent === 'agreed_posted' && posted.grossPerUnit > 0) {
      patch.proposed_rate = posted.grossPerUnit;
    } else if (body.proposed_rate !== undefined && body.proposed_rate !== '') {
      const legacy = Number(body.proposed_rate);
      patch.proposed_rate = Number.isFinite(legacy) && legacy > 0 ? legacy : null;
    } else {
      patch.proposed_rate = null;
    }

    return patch;
  }

  async updateRate({ applicationId, actionBody, actor, writeClient }) {
    const app = await this.repo.getApplicationWithProject(applicationId);
    if (!app) throw new HttpError(404, 'Application not found');

    const project = app.projects;
    if (!project) throw new HttpError(404, 'Project not found');

    this.#assertActorAccess(app, project, actor);

    const action = actionBody.action;
    const posted = projectPostedRates(project);
    let patch = {};
    const historyActor = actor.role === 'expert' ? 'expert' : 'institution';

    if (action === 'expert_propose') {
      this.#assertExpert(actor);
      this.#assertCanNegotiate(app);
      const net = actionBody.proposed_net_per_unit;
      if (!net) throw new HttpError(400, 'proposed_net_per_unit is required');
      const gross = toInstitutionGrossFromNet(net);
      patch = {
        proposed_net_per_unit: net,
        institution_counter_gross_per_unit: null,
        rate_status: app.rate_status === 'institution_countered' ? 'expert_countered' : 'expert_proposed',
        rate_note: actionBody.note,
        proposed_rate: gross,
        negotiation_history: appendNegotiationHistory(app.negotiation_history, {
          actor: historyActor,
          action: 'expert_propose',
          net_per_unit: net,
          gross_per_unit: gross,
          note: actionBody.note,
        }),
      };
    } else if (action === 'institution_counter') {
      this.#assertInstitution(actor);
      this.#assertCanNegotiate(app);
      const gross = actionBody.institution_counter_gross_per_unit;
      if (!gross) throw new HttpError(400, 'institution_counter_gross_per_unit is required');
      const net = toExpertNet(gross);
      this.#assertBudgetGuard(gross, posted, actionBody.approve_over_budget);
      patch = {
        institution_counter_gross_per_unit: gross,
        rate_status: 'institution_countered',
        rate_note: actionBody.note,
        negotiation_history: appendNegotiationHistory(app.negotiation_history, {
          actor: historyActor,
          action: 'institution_counter',
          net_per_unit: net,
          gross_per_unit: gross,
          note: actionBody.note,
        }),
      };
    } else if (action === 'accept_proposal') {
      this.#assertInstitution(actor);
      this.#assertCanNegotiate(app);
      const net = parsePositiveNumber(app.proposed_net_per_unit);
      if (!net) throw new HttpError(400, 'No expert proposal to accept');
      const gross = toInstitutionGrossFromNet(net);
      this.#assertBudgetGuard(gross, posted, actionBody.approve_over_budget);
      patch = this.#lockRates(app, posted, gross, net, historyActor, 'accept_proposal', actionBody.note);
    } else if (action === 'accept_counter') {
      this.#assertExpert(actor);
      this.#assertCanNegotiate(app);
      const gross = parsePositiveNumber(app.institution_counter_gross_per_unit);
      if (!gross) throw new HttpError(400, 'No institution counter to accept');
      const net = toExpertNet(gross);
      patch = this.#lockRates(app, posted, gross, net, historyActor, 'accept_counter', actionBody.note);
    } else if (action === 'offer_posted_rate') {
      // Institution asks to close negotiation and proceed at the original posted rate.
      // Does NOT lock — expert must accept or decline.
      this.#assertInstitution(actor);
      this.#assertCanNegotiate(app);
      const gross = posted.grossPerUnit;
      const net = posted.netPerUnit;
      if (!(gross > 0)) throw new HttpError(400, 'Project has no posted rate to offer');
      patch = {
        rate_status: 'posted_rate_offered',
        rate_note: actionBody.note || app.rate_note || null,
        institution_counter_gross_per_unit: null,
        negotiation_history: appendNegotiationHistory(app.negotiation_history, {
          actor: historyActor,
          action: 'offer_posted_rate',
          net_per_unit: net,
          gross_per_unit: gross,
          note: actionBody.note || null,
        }),
      };
    } else if (action === 'accept_posted_offer') {
      this.#assertExpert(actor);
      if (!isPostedRateOfferPending(app.rate_status)) {
        throw new HttpError(400, 'No posted-rate request awaiting your response');
      }
      const gross = posted.grossPerUnit;
      const net = posted.netPerUnit;
      if (!(gross > 0)) throw new HttpError(400, 'Project has no posted rate to accept');
      patch = this.#lockRates(app, posted, gross, net, historyActor, 'accept_posted_offer', actionBody.note);
      patch.rate_status = 'agreed_posted';
    } else if (action === 'decline_posted_offer') {
      this.#assertExpert(actor);
      if (!isPostedRateOfferPending(app.rate_status)) {
        throw new HttpError(400, 'No posted-rate request awaiting your response');
      }
      patch = {
        rate_status: 'posted_rate_declined',
        final_gross_per_unit: null,
        final_net_per_unit: null,
        rate_note: actionBody.note || app.rate_note || null,
        negotiation_history: appendNegotiationHistory(app.negotiation_history, {
          actor: historyActor,
          action: 'decline_posted_offer',
          net_per_unit: posted.netPerUnit || null,
          gross_per_unit: posted.grossPerUnit || null,
          note: actionBody.note || null,
        }),
      };
    } else if (action === 'accept_posted') {
      // Expert may still voluntarily accept posted during open negotiation.
      // Institution must use offer_posted_rate (expert approval required).
      this.#assertExpert(actor);
      this.#assertCanNegotiate(app);
      const gross = posted.grossPerUnit;
      const net = posted.netPerUnit;
      if (!(gross > 0)) throw new HttpError(400, 'Project has no posted rate to accept');
      patch = this.#lockRates(app, posted, gross, net, historyActor, 'accept_posted', actionBody.note);
      patch.rate_status = 'agreed_posted';
    } else {
      throw new HttpError(400, 'Unknown rate action');
    }

    return this.repo.updateApplication(applicationId, patch, writeClient);
  }

  /**
   * Confirm & lock: set accepted + locked rates; return booking payload fields.
   * Does not create booking itself when caller prefers existing booking create path —
   * use confirmAndCreateBooking for the full flow.
   */
  async confirmAndCreateBooking({
    applicationId,
    institutionId,
    actor,
    writeClient,
    approveOverBudget = false,
  }) {
    this.#assertInstitution(actor);
    const app = await this.repo.getApplicationWithProject(applicationId);
    if (!app) throw new HttpError(404, 'Application not found');
    const project = app.projects;
    if (!project) throw new HttpError(404, 'Project not found');
    if (String(project.institution_id) !== String(institutionId)) {
      throw new HttpError(403, 'Unauthorized');
    }

    const posted = projectPostedRates(project);
    let finalGross = parsePositiveNumber(app.final_gross_per_unit);
    let finalNet = parsePositiveNumber(app.final_net_per_unit);
    let rateStatus = app.rate_status || app.rate_intent;

    if (!isRateAgreed(rateStatus) || !(finalGross > 0 && finalNet > 0)) {
      if (isPostedRateDeclined(rateStatus)) {
        throw new HttpError(
          400,
          'Expert declined proceeding at the posted rate. Booking cannot continue for this application.'
        );
      }
      if (isPostedRateOfferPending(rateStatus)) {
        throw new HttpError(400, 'Waiting for the expert to respond to the posted-rate request');
      }
      if (rateStatus === 'agreed_posted' || app.rate_intent === 'agreed_posted') {
        finalGross = posted.grossPerUnit;
        finalNet = posted.netPerUnit;
        rateStatus = 'agreed_posted';
      } else if (parsePositiveNumber(app.institution_counter_gross_per_unit)) {
        throw new HttpError(400, 'Rate not agreed yet — accept the counter or proposal first');
      } else if (parsePositiveNumber(app.proposed_net_per_unit)) {
        throw new HttpError(400, 'Rate not agreed yet — accept the expert proposal first');
      } else if (app.rate_intent === 'open_to_negotiate') {
        throw new HttpError(400, 'Complete rate negotiation before confirming booking');
      } else {
        // Legacy fallback
        finalGross = resolveBookingAmount(app, project);
        finalNet = toExpertNet(finalGross);
        rateStatus = 'agreed';
      }
    }

    if (!(finalGross > 0 && finalNet > 0)) {
      throw new HttpError(400, 'Cannot lock booking without a valid rate');
    }

    this.#assertBudgetGuard(finalGross, posted, approveOverBudget);

    const appPatch = {
      status: 'accepted',
      reviewed_at: new Date().toISOString(),
      rate_status: rateStatus === 'agreed_posted' ? 'agreed_posted' : 'agreed',
      final_gross_per_unit: finalGross,
      final_net_per_unit: finalNet,
      compensation_unit: posted.unit,
      unit_quantity: posted.quantity,
      final_hourly_rate: posted.unit === 'hourly' ? finalGross : null,
      negotiation_history: appendNegotiationHistory(app.negotiation_history, {
        actor: 'institution',
        action: 'confirm_and_lock',
        net_per_unit: finalNet,
        gross_per_unit: finalGross,
      }),
    };

    const updatedApp = await this.repo.updateApplication(applicationId, appPatch, writeClient);

    const startDate = project.start_date
      ? String(project.start_date).slice(0, 10)
      : new Date().toISOString().split('T')[0];
    const endDate = project.end_date
      ? String(project.end_date).slice(0, 10)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const booking = await this.repo.createBooking(
      {
        expert_id: app.expert_id,
        institution_id: institutionId,
        project_id: app.project_id,
        application_id: applicationId,
        amount: finalGross,
        start_date: startDate,
        end_date: endDate,
        hours_booked: posted.durationHours || project.duration_hours || null,
        status: 'in_progress',
        payment_status: 'pending',
        final_gross_per_unit: finalGross,
        final_net_per_unit: finalNet,
        compensation_unit: posted.unit,
        unit_quantity: posted.quantity,
      },
      writeClient
    );

    return { application: updatedApp, booking };
  }

  #lockRates(app, posted, gross, net, actor, action, note) {
    return {
      final_gross_per_unit: gross,
      final_net_per_unit: net,
      compensation_unit: posted.unit,
      unit_quantity: posted.quantity,
      rate_status: 'agreed',
      rate_note: note || app.rate_note || null,
      final_hourly_rate: posted.unit === 'hourly' ? gross : null,
      proposed_rate: gross,
      negotiation_history: appendNegotiationHistory(app.negotiation_history, {
        actor,
        action,
        net_per_unit: net,
        gross_per_unit: gross,
        note: note || null,
      }),
    };
  }

  #assertBudgetGuard(grossPerUnit, posted, approveOverBudget) {
    if (!(posted.totalGross > 0) || !(posted.quantity > 0)) return;
    const proposedTotal =
      posted.unit === 'fixed_package' ? grossPerUnit : grossPerUnit * posted.quantity;
    if (proposedTotal > posted.totalGross * 1.001 && !approveOverBudget) {
      throw new HttpError(
        400,
        'Offer exceeds posted budget. Set approve_over_budget to confirm.'
      );
    }
  }

  #assertCanNegotiate(app) {
    if (app.rate_intent === 'agreed_posted' && isRateAgreed(app.rate_status || app.rate_intent)) {
      throw new HttpError(400, 'Expert already agreed to the posted rate');
    }
    if (isRateAgreed(app.rate_status)) {
      throw new HttpError(400, 'Rate is already agreed');
    }
    if (isPostedRateOfferPending(app.rate_status)) {
      throw new HttpError(400, 'A posted-rate request is awaiting the expert’s response');
    }
    if (isPostedRateDeclined(app.rate_status)) {
      throw new HttpError(400, 'Negotiation was closed after the expert declined the posted rate');
    }
    if (isRateNegotiationClosed(app.rate_status)) {
      throw new HttpError(400, 'Rate negotiation is closed for this application');
    }
    if (app.status !== 'interview' && app.status !== 'accepted') {
      throw new HttpError(400, 'Negotiation unlocks after interview / shortlist');
    }
  }

  #assertActorAccess(app, project, actor) {
    if (actor.role === 'expert') {
      if (String(actor.expertId) !== String(app.expert_id)) {
        throw new HttpError(403, 'Unauthorized');
      }
      return;
    }
    if (actor.role === 'institution') {
      if (String(actor.institutionId) !== String(project.institution_id)) {
        throw new HttpError(403, 'Unauthorized');
      }
      return;
    }
    if (actor.role === 'super_admin') return;
    throw new HttpError(403, 'Unauthorized');
  }

  #assertExpert(actor) {
    if (actor.role !== 'expert' && actor.role !== 'super_admin') {
      throw new HttpError(403, 'Only the expert can perform this action');
    }
  }

  #assertInstitution(actor) {
    if (actor.role !== 'institution' && actor.role !== 'super_admin') {
      throw new HttpError(403, 'Only the institution can perform this action');
    }
  }
}

module.exports = ApplicationRateService;
module.exports.HttpError = HttpError;
