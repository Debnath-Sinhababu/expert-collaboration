const LegacyAdminService = require('./legacyAdmin.service');

class LegacyAdminController {
  constructor(service = new LegacyAdminService()) {
    this.service = service;
  }

  feedbackAnalytics = (req, res) => this.service.feedbackAnalytics(req, res);
  listExperts = (req, res) => this.service.listExperts(req, res);
  listInstitutions = (req, res) => this.service.listInstitutions(req, res);
  listStudents = (req, res) => this.service.listStudents(req, res);
  createExpert = (req, res) => this.service.createExpert(req, res);
  listSuperAdmins = (req, res) => this.service.listSuperAdmins(req, res);
  createSuperAdmin = (req, res) => this.service.createSuperAdmin(req, res);
  promoteSuperAdmin = (req, res) => this.service.promoteSuperAdmin(req, res);
  listCustomDomains = (req, res) => this.service.listCustomDomains(req, res);
  bulkImportExperts = (req, res) => this.service.bulkImportExperts(req, res);
  listRequirements = (req, res) => this.service.listRequirements(req, res);
  updateRequirementStatus = (req, res) => this.service.updateRequirementStatus(req, res);
}

module.exports = LegacyAdminController;
