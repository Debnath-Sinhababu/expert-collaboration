const ApplicationRateService = require('./applicationRate.service');
const { parseRateActionBody, parseLockBody } = require('./applicationRate.dto');
const expertAccess = require('../../../auth/expertAccess');
const institutionAccess = require('../../../auth/institutionAccess');

class ApplicationRateController {
  constructor(service = null) {
    this.service =
      service ||
      new ApplicationRateService(institutionAccess.getServiceClient());
  }

  updateRate = async (req, res) => {
    const applicationId = req.params.id;
    const actionBody = parseRateActionBody(req.body || {});

    try {
      const { actor, writeClient } = await this.#resolveActorForApplication(req, applicationId);
      const updated = await this.service.updateRate({
        applicationId,
        actionBody,
        actor,
        writeClient,
      });
      res.json(updated);
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  confirmLock = async (req, res) => {
    const applicationId = req.params.id;
    const lockBody = parseLockBody(req.body || {});
    const service = institutionAccess.getServiceClient();

    const { data: appRow, error: appErr } = await service
      .from('applications')
      .select('id, project_id')
      .eq('id', applicationId)
      .maybeSingle();
    if (appErr) throw appErr;
    if (!appRow) return res.status(404).json({ error: 'Application not found' });

    const { data: projRow, error: projErr } = await service
      .from('projects')
      .select('institution_id')
      .eq('id', appRow.project_id)
      .maybeSingle();
    if (projErr) throw projErr;
    if (!projRow) return res.status(404).json({ error: 'Project not found' });

    const access = await institutionAccess.resolveInstitutionAccess(req, projRow.institution_id);
    if (!access) return res.status(403).json({ error: 'Unauthorized' });

    const writeClient = institutionAccess.getWriteClientForInstitution(access);
    const actor = { role: 'institution', institutionId: projRow.institution_id };

    try {
      const result = await this.service.confirmAndCreateBooking({
        applicationId,
        institutionId: projRow.institution_id,
        actor,
        writeClient,
        approveOverBudget: lockBody.approve_over_budget,
      });
      res.status(201).json(result);
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  async #resolveActorForApplication(req, applicationId) {
    const service = institutionAccess.getServiceClient();
    const { data: app, error } = await service
      .from('applications')
      .select('id, expert_id, project_id, projects(institution_id)')
      .eq('id', applicationId)
      .maybeSingle();
    if (error) throw error;
    if (!app) {
      const err = new Error('Application not found');
      err.status = 404;
      throw err;
    }

    const institutionId = app.projects?.institution_id;
    const actingExpertId = expertAccess.parseActingExpertId(req);
    const actingInstitutionId = institutionAccess.parseActingInstitutionId(req);

    // Prefer the explicit acting workspace (super_admin browsing as expert vs institution).
    const preferExpert =
      Boolean(actingExpertId) && String(actingExpertId) === String(app.expert_id);
    const preferInstitution =
      Boolean(actingInstitutionId) &&
      institutionId &&
      String(actingInstitutionId) === String(institutionId);

    if (preferExpert) {
      const expertAccessResult = await expertAccess.resolveExpertAccess(req, app.expert_id);
      if (expertAccessResult) {
        return {
          actor: { role: 'expert', expertId: app.expert_id },
          writeClient: expertAccess.getWriteClientForExpert(expertAccessResult),
        };
      }
    }

    if (preferInstitution || (!preferExpert && institutionId)) {
      const institutionAccessResult = await institutionAccess.resolveInstitutionAccess(
        req,
        institutionId
      );
      if (institutionAccessResult) {
        return {
          actor: { role: 'institution', institutionId },
          writeClient: institutionAccess.getWriteClientForInstitution(institutionAccessResult),
        };
      }
    }

    const expertAccessResult = await expertAccess.resolveExpertAccess(req, app.expert_id);
    if (expertAccessResult) {
      return {
        actor: { role: 'expert', expertId: app.expert_id },
        writeClient: expertAccess.getWriteClientForExpert(expertAccessResult),
      };
    }

    const err = new Error('Unauthorized');
    err.status = 403;
    throw err;
  }

  #sendError(res, err) {
    const status = err.status || 500;
    if (status >= 500) {
      console.error('ApplicationRateController error:', err);
    }
    res.status(status).json({ error: err.message || 'Request failed' });
  }
}

module.exports = ApplicationRateController;
