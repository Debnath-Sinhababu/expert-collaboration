const handlers = require('./ratings.handlers');

class RatingsService {
  create(req, res) { return handlers.create(req, res); }
  list(req, res) { return handlers.list(req, res); }
}

module.exports = RatingsService;
