const handlers = require('./legacyAdmin.handlers');

class LegacyAdminService {
  feedbackAnalytics(req, res) { return handlers.feedbackAnalytics(req, res); }
  listExperts(req, res) { return handlers.listExperts(req, res); }
  listInstitutions(req, res) { return handlers.listInstitutions(req, res); }
  listStudents(req, res) { return handlers.listStudents(req, res); }
  createExpert(req, res) { return handlers.createExpert(req, res); }
  listSuperAdmins(req, res) { return handlers.listSuperAdmins(req, res); }
  createSuperAdmin(req, res) { return handlers.createSuperAdmin(req, res); }
  promoteSuperAdmin(req, res) { return handlers.promoteSuperAdmin(req, res); }
  listCustomDomains(req, res) { return handlers.listCustomDomains(req, res); }
  bulkImportExperts(req, res) { return handlers.bulkImportExperts(req, res); }
  listRequirements(req, res) { return handlers.listRequirements(req, res); }
  updateRequirementStatus(req, res) { return handlers.updateRequirementStatus(req, res); }
}

module.exports = LegacyAdminService;
