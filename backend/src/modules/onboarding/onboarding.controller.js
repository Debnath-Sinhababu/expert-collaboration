const OnboardingService = require('./onboarding.service');
const { parseDeclineBody } = require('./onboarding.dto');
const expertAccess = require('../../../auth/expertAccess');
const institutionAccess = require('../../../auth/institutionAccess');
const { buildOfferLetterHtml } = require('../../../services/offerLetterTemplate');

class OnboardingController {
  constructor(service = null) {
    this.service = service || new OnboardingService(institutionAccess.getServiceClient());
  }

  list = async (req, res) => {
    const { application_id: applicationId, status } = req.query;

    let expertId = null;
    let institutionId = null;

    const actingExpertId = expertAccess.parseActingExpertId(req);
    const actingInstitutionId = institutionAccess.parseActingInstitutionId(req);

    if (actingExpertId) {
      const access = await expertAccess.resolveExpertAccess(req, actingExpertId);
      if (!access) return res.status(403).json({ error: 'Unauthorized' });
      expertId = actingExpertId;
    } else if (actingInstitutionId) {
      const access = await institutionAccess.resolveInstitutionAccess(req, actingInstitutionId);
      if (!access) return res.status(403).json({ error: 'Unauthorized' });
      institutionId = actingInstitutionId;
    } else if (req.query.expert_id) {
      const access = await expertAccess.resolveExpertAccess(req, req.query.expert_id);
      if (!access) return res.status(403).json({ error: 'Unauthorized' });
      expertId = req.query.expert_id;
    } else if (req.query.institution_id) {
      const access = await institutionAccess.resolveInstitutionAccess(req, req.query.institution_id);
      if (!access) return res.status(403).json({ error: 'Unauthorized' });
      institutionId = req.query.institution_id;
    } else {
      return res.status(400).json({ error: 'expert_id or institution_id is required' });
    }

    try {
      const requests = await this.service.listRequests({ status, expertId, institutionId, applicationId });
      res.json(requests);
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  getById = async (req, res) => {
    try {
      const request = await this.service.getRequest(req.params.id);
      const expertAccessResult = await expertAccess.resolveExpertAccess(req, request.expert_id).catch(() => null);
      const institutionAccessResult = expertAccessResult
        ? null
        : await institutionAccess.resolveInstitutionAccess(req, request.institution_id).catch(() => null);
      if (!expertAccessResult && !institutionAccessResult) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      res.json(request);
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  previewHtml = async (req, res) => {
    try {
      const request = await this.service.getRequest(req.params.id);
      const expertAccessResult = await expertAccess.resolveExpertAccess(req, request.expert_id).catch(() => null);
      const institutionAccessResult = expertAccessResult
        ? null
        : await institutionAccess.resolveInstitutionAccess(req, request.institution_id).catch(() => null);
      if (!expertAccessResult && !institutionAccessResult) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      if (!request.offer_letter_data) {
        return res.status(404).json({ error: 'No preview available for this offer letter' });
      }
      res.json({ html: buildOfferLetterHtml(request.offer_letter_data) });
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  accept = async (req, res) => {
    try {
      const request = await this.service.getRequest(req.params.id);
      const access = await expertAccess.resolveExpertAccess(req, request.expert_id);
      if (!access) return res.status(403).json({ error: 'Unauthorized' });
      const updated = await this.service.acceptOffer(req.params.id, request.expert_id);
      res.json(updated);
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  decline = async (req, res) => {
    try {
      const { reason } = parseDeclineBody(req.body || {});
      const request = await this.service.getRequest(req.params.id);
      const access = await expertAccess.resolveExpertAccess(req, request.expert_id);
      if (!access) return res.status(403).json({ error: 'Unauthorized' });
      const updated = await this.service.declineOffer(req.params.id, request.expert_id, reason);
      res.json(updated);
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  #sendError(res, err) {
    const status = err.status || 500;
    if (status >= 500) {
      console.error('OnboardingController error:', err);
    }
    res.status(status).json({ error: err.message || 'Request failed' });
  }
}

module.exports = OnboardingController;
