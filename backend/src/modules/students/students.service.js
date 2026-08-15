const handlers = require('./students.handlers');
const feedbackHandlers = require('./students.feedback.handlers');

class StudentsService {
  me(req, res) { return handlers.me(req, res); }
  create(req, res) { return handlers.create(req, res); }
  update(req, res) { return handlers.update(req, res); }
  listFeatured(req, res) { return handlers.listFeatured(req, res); }
  list(req, res) { return handlers.list(req, res); }

  login(req, res) { return feedbackHandlers.login(req, res); }
  sessions(req, res) { return feedbackHandlers.sessions(req, res); }
  feedbackStatus(req, res) { return feedbackHandlers.feedbackStatus(req, res); }
  submitFeedback(req, res) { return feedbackHandlers.submitFeedback(req, res); }
  feedbackByExpert(req, res) { return feedbackHandlers.feedbackByExpert(req, res); }
}

module.exports = StudentsService;
