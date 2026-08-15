const ProjectsService = require('./projects.service');

class ProjectsController {
  constructor(service = new ProjectsService()) {
    this.service = service;
  }

  list = (req, res) => this.service.list(req, res);
  listTypes = (req, res) => this.service.listTypes(req, res);
  counts = (req, res) => this.service.counts(req, res);
  create = (req, res) => this.service.create(req, res);
  getById = (req, res) => this.service.getById(req, res);
  update = (req, res) => this.service.update(req, res);
  getEditRequest = (req, res) => this.service.getEditRequest(req, res);
  listRecommended = (req, res) => this.service.listRecommended(req, res);
}

module.exports = ProjectsController;
