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
   * Owner-only — deliberately does NOT allow the super-admin "acting as" override that
   * resolveExpertAccess normally supports for other expert-scoped routes. Linking /
   * minting a real external Calxbook account on someone else's behalf via admin
   * impersonation is a meaningfully different risk than the read-mostly admin actions
   * that pattern is otherwise used for, so it's rejected here even for a super admin.
   */
  async #resolveOwnerAccess(req, expertId) {
    const access = await expertAccess.resolveExpertAccess(req, expertId);
    if (!access || access.mode !== 'owner') {
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
