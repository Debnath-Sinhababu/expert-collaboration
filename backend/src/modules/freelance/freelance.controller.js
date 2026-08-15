const FreelanceService = require('./freelance.service');

class FreelanceController {
  constructor(service = new FreelanceService()) {
    this.service = service;
  }

  listPublic = (req, res) => this.service.listPublic(req, res);
  createProject = (req, res) => this.service.createProject(req, res);
  listProjects = (req, res) => this.service.listProjects(req, res);
  listVisibleProjects = (req, res) => this.service.listVisibleProjects(req, res);
  apply = (req, res) => this.service.apply(req, res);
  updateApplicationStatus = (req, res) => this.service.updateApplicationStatus(req, res);
  createSubmission = (req, res) => this.service.createSubmission(req, res);
  getApplicationStatus = (req, res) => this.service.getApplicationStatus(req, res);
  listMyApplications = (req, res) => this.service.listMyApplications(req, res);
  listMySubmissions = (req, res) => this.service.listMySubmissions(req, res);
  getProjectById = (req, res) => this.service.getProjectById(req, res);
  listProjectApplications = (req, res) => this.service.listProjectApplications(req, res);
  listProjectSubmissions = (req, res) => this.service.listProjectSubmissions(req, res);
}

module.exports = FreelanceController;
