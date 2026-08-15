const RatingsService = require('./ratings.service');

class RatingsController {
  constructor(service = new RatingsService()) {
    this.service = service;
  }

  create = (req, res) => this.service.create(req, res);
  list = (req, res) => this.service.list(req, res);
}

module.exports = RatingsController;
