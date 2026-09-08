const expertAccess = require('../../../auth/expertAccess');
const CalxbookHandoffRepository = require('./calxbookHandoff.repository');
const handoffService = require('./calxbookHandoff.service');
const { loadScoreConfig, computeProfileScore } = require('./profileScore.service');

class CalxbookHandoffController {
  constructor(repository = null) {
    this.repository = repository || new CalxbookHandoffRepository(expertAccess.getServiceClient());
  }

  join = async (req, res) => {
    const expertId = req.params.id;
    try {
      const access = await expertAccess.resolveExpertAccess(req, expertId);
      if (!access) return this.#unauthorized(res);
      const expert = access.expert;
      if (!expert.is_verified) {
        const err = new Error('Only verified experts can join Calxbook.');
        err.status = 403;
        throw err;
      }

      let redirectUrl;
      if (expert.calxbook_mentor_linked_at) {
        // Already linked -- a "join" click here is really a switch.
        redirectUrl = await handoffService.sendHandoff(handoffService.buildSwitchPayload(expert));
      } else {
        const serviceClient = expertAccess.getServiceClient();
        const scoreConfig = await loadScoreConfig(serviceClient);
        // profile_score is normally kept fresh by the /api/calxbook/experts sync; if this
        // expert has never been synced yet, fall back to computing it here with a 0-training
        // floor rather than blocking the join on an extra bookings query -- it self-corrects
        // on the very next sync regardless, since profile_score keeps live-syncing afterward.
        const profileScore = expert.profile_score ?? computeProfileScore(expert, 0, scoreConfig);
        redirectUrl = await handoffService.sendHandoff(handoffService.buildJoinPayload(expert, profileScore));
        await this.repository.markLinked(expertId);
      }
      res.json({ redirectUrl });
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  switchTo = async (req, res) => {
    const expertId = req.params.id;
    try {
      const access = await expertAccess.resolveExpertAccess(req, expertId);
      if (!access) return this.#unauthorized(res);
      const expert = access.expert;
      if (!expert.calxbook_mentor_linked_at) {
        const err = new Error('This expert has not joined Calxbook yet.');
        err.status = 409;
        throw err;
      }
      const redirectUrl = await handoffService.sendHandoff(handoffService.buildSwitchPayload(expert));
      res.json({ redirectUrl });
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  #unauthorized(res) {
    res.status(403).json({ error: 'Unauthorized' });
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
