const expertAccess = require('../../../auth/expertAccess');
const CalxbookHandoffService = require('./calxbookHandoff.service');
const CalxbookHandoffRepository = require('./calxbookHandoff.repository');

class CalxbookHandoffController {
  constructor(service = null) {
    this.service = service || new CalxbookHandoffService(
      new CalxbookHandoffRepository(expertAccess.getServiceClient())
    );
  }

  joinCalxbook = async (req, res) => {
    try {
      const access = await this.#resolveOwnerAccess(req, req.params.id);
      const writeClient = expertAccess.getWriteClientForExpert(access);
      const result = await this.service.joinCalxbook({ expertRow: access.expert, writeClient });
      res.json(result);
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  switchCalxbook = async (req, res) => {
    try {
      const access = await this.#resolveOwnerAccess(req, req.params.id);
      const result = await this.service.switchCalxbook({ expertRow: access.expert });
      res.json(result);
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  /**
   * Accepts either the expert themselves (mode 'owner') or a super admin acting on that
   * expert's behalf via the X-Acting-Expert-Id header (mode 'super_admin') — same pattern
   * bookingCompletion.controller.js and onboarding.controller.js already use for other
   * expert-scoped actions. A super admin opening an expert's workspace and clicking
   * Join/Switch Calxbook needs this to succeed the same way it does for the expert's own
   * session; resolveExpertAccess() already resolves and validates the acting-expert id,
   * this just stops narrowing its result back down to owner-only.
   */
  async #resolveOwnerAccess(req, expertId) {
    const access = await expertAccess.resolveExpertAccess(req, expertId);
    if (!access) {
      const err = new Error('Unauthorized');
      err.status = 403;
      throw err;
    }
    return access;
  }

  #sendError(res, err) {
    const status = err.status || 500;
    if (status >= 500) {
      console.error('CalxbookHandoffController error:', err);
    }
    res.status(status).json({ error: err.message || 'Request failed' });
  }
}

module.exports = CalxbookHandoffController;
