const handlers = require('./projects.handlers');

class ProjectsService {
  list(req, res) { return handlers.list(req, res); }
  listTypes(req, res) { return handlers.listTypes(req, res); }
  counts(req, res) { return handlers.counts(req, res); }
  create(req, res) { return handlers.create(req, res); }
  getById(req, res) { return handlers.getById(req, res); }
  update(req, res) { return handlers.update(req, res); }
  getEditRequest(req, res) { return handlers.getEditRequest(req, res); }
  listRecommended(req, res) { return handlers.listRecommended(req, res); }
}

module.exports = ProjectsService;
