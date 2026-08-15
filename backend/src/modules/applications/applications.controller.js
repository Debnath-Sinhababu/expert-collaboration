const ApplicationsService = require('./applications.service');

class ApplicationsController {
  constructor(service = new ApplicationsService()) {
    this.service = service;
  }

  list = (req, res) => this.service.list(req, res);
  counts = (req, res) => this.service.counts(req, res);
  create = (req, res) => this.service.create(req, res);
  update = (req, res) => this.service.update(req, res);
}

module.exports = ApplicationsController;
