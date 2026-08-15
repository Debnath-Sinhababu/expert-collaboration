const StudentsService = require('./students.service');

class StudentsController {
  constructor(service = new StudentsService()) {
    this.service = service;
  }

  me = (req, res) => this.service.me(req, res);
  create = (req, res) => this.service.create(req, res);
  update = (req, res) => this.service.update(req, res);
  listFeatured = (req, res) => this.service.listFeatured(req, res);
  list = (req, res) => this.service.list(req, res);

  login = (req, res) => this.service.login(req, res);
  sessions = (req, res) => this.service.sessions(req, res);
  feedbackStatus = (req, res) => this.service.feedbackStatus(req, res);
  submitFeedback = (req, res) => this.service.submitFeedback(req, res);
  feedbackByExpert = (req, res) => this.service.feedbackByExpert(req, res);
}

module.exports = StudentsController;
