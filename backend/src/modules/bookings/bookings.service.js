const handlers = require('./bookings.handlers');

class BookingsService {
  create(req, res) { return handlers.create(req, res); }
  list(req, res) { return handlers.list(req, res); }
  counts(req, res) { return handlers.counts(req, res); }
  update(req, res) { return handlers.update(req, res); }
  remove(req, res) { return handlers.remove(req, res); }
}

module.exports = BookingsService;
