const handlers = require('./experts.handlers');

/**
 * Thin service facade over extracted handlers.
 * Future extractions can move logic from handlers → repository here.
 */
class ExpertsService {
  financeSummary(req, res) {
    return handlers.financeSummary(req, res);
  }

  list(req, res) {
    return handlers.list(req, res);
  }

  listCalxbook(req, res) {
    return handlers.listCalxbook(req, res);
  }

  create(req, res) {
    return handlers.create(req, res);
  }

  getById(req, res) {
    return handlers.getById(req, res);
  }

  getByUserId(req, res) {
    return handlers.getByUserId(req, res);
  }

  update(req, res) {
    return handlers.update(req, res);
  }

  setCalxbookVisibility(req, res) {
    return handlers.setCalxbookVisibility(req, res);
  }

  listRecommended(req, res) {
    return handlers.listRecommended(req, res);
  }
}

module.exports = ExpertsService;
