const handlers = require('./internships.handlers');

class InternshipsService {
  create(req, res) { return handlers.create(req, res); }
  list(req, res) { return handlers.list(req, res); }
  listVisible(req, res) { return handlers.listVisible(req, res); }
  getById(req, res) { return handlers.getById(req, res); }
  apply(req, res) { return handlers.apply(req, res); }
  listApplicationsForInternship(req, res) {
    return handlers.listApplicationsForInternship(req, res);
  }
  updateApplicationStatus(req, res) {
    return handlers.updateApplicationStatus(req, res);
  }
  listApplicationsForInstitution(req, res) {
    return handlers.listApplicationsForInstitution(req, res);
  }
  updateInstitutionStatus(req, res) {
    return handlers.updateInstitutionStatus(req, res);
  }
  getApplicationStatus(req, res) {
    return handlers.getApplicationStatus(req, res);
  }
  listMyApplications(req, res) {
    return handlers.listMyApplications(req, res);
  }
}

module.exports = InternshipsService;
