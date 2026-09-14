const express = require('express');
const asyncHandler = require('../../shared/http/asyncHandler');
const CalxbookHandoffController = require('./calxbookHandoff.controller');

function createCalxbookHandoffRouter() {
  const router = express.Router();
  const controller = new CalxbookHandoffController();

  router.post('/:id/join-calxbook', asyncHandler(controller.joinCalxbook));
  router.post('/:id/switch-calxbook', asyncHandler(controller.switchCalxbook));

  return router;
}

module.exports = { createCalxbookHandoffRouter };
