const InternshipsService = require('./internships.service');

class InternshipsController {
  constructor(service = new InternshipsService()) {
    this.service = service;
  }

  create = (req, res) => this.service.create(req, res);
  list = (req, res) => this.service.list(req, res);
  listVisible = (req, res) => this.service.listVisible(req, res);
  getById = (req, res) => this.service.getById(req, res);
  apply = (req, res) => this.service.apply(req, res);
  listApplicationsForInternship = (req, res) =>
    this.service.listApplicationsForInternship(req, res);
  updateApplicationStatus = (req, res) =>
    this.service.updateApplicationStatus(req, res);
  listApplicationsForInstitution = (req, res) =>
    this.service.listApplicationsForInstitution(req, res);
  updateInstitutionStatus = (req, res) =>
    this.service.updateInstitutionStatus(req, res);
  getApplicationStatus = (req, res) =>
    this.service.getApplicationStatus(req, res);
  listMyApplications = (req, res) =>
    this.service.listMyApplications(req, res);
}

module.exports = InternshipsController;
