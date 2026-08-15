const ExpertsService = require('./experts.service');

class ExpertsController {
  constructor(service = new ExpertsService()) {
    this.service = service;
  }

  financeSummary = (req, res) => this.service.financeSummary(req, res);
  list = (req, res) => this.service.list(req, res);
  listCalxbook = (req, res) => this.service.listCalxbook(req, res);
  create = (req, res) => this.service.create(req, res);
  getById = (req, res) => this.service.getById(req, res);
  getByUserId = (req, res) => this.service.getByUserId(req, res);
  update = (req, res) => this.service.update(req, res);
  setCalxbookVisibility = (req, res) => this.service.setCalxbookVisibility(req, res);
  listRecommended = (req, res) => this.service.listRecommended(req, res);
}

module.exports = ExpertsController;
