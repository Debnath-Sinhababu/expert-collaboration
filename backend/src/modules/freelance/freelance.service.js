const handlers = require('./freelance.handlers');

class FreelanceService {
  listPublic(req, res) { return handlers.listPublic(req, res); }
  createProject(req, res) { return handlers.createProject(req, res); }
  listProjects(req, res) { return handlers.listProjects(req, res); }
  listVisibleProjects(req, res) { return handlers.listVisibleProjects(req, res); }
  apply(req, res) { return handlers.apply(req, res); }
  updateApplicationStatus(req, res) { return handlers.updateApplicationStatus(req, res); }
  createSubmission(req, res) { return handlers.createSubmission(req, res); }
  getApplicationStatus(req, res) { return handlers.getApplicationStatus(req, res); }
  listMyApplications(req, res) { return handlers.listMyApplications(req, res); }
  listMySubmissions(req, res) { return handlers.listMySubmissions(req, res); }
  getProjectById(req, res) { return handlers.getProjectById(req, res); }
  listProjectApplications(req, res) { return handlers.listProjectApplications(req, res); }
  listProjectSubmissions(req, res) { return handlers.listProjectSubmissions(req, res); }
}

module.exports = FreelanceService;
