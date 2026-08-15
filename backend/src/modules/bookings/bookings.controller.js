const BookingsService = require('./bookings.service');

class BookingsController {
  constructor(service = new BookingsService()) {
    this.service = service;
  }

  create = (req, res) => this.service.create(req, res);
  list = (req, res) => this.service.list(req, res);
  counts = (req, res) => this.service.counts(req, res);
  update = (req, res) => this.service.update(req, res);
  remove = (req, res) => this.service.remove(req, res);
}

module.exports = BookingsController;
