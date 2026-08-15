const handlers = require('./applications.handlers');

class ApplicationsService {
  list(req, res) { return handlers.list(req, res); }
  counts(req, res) { return handlers.counts(req, res); }
  create(req, res) { return handlers.create(req, res); }
  update(req, res) { return handlers.update(req, res); }
}

module.exports = ApplicationsService;
