const express = require('express');
const asyncHandler = require('../../shared/http/asyncHandler');
const CalxbookHandoffController = require('./calxbookHandoff.controller');

function createCalxbookHandoffRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new CalxbookHandoffController();

  router.post('/:id/join-calxbook', asyncHandler(controller.join));
  router.post('/:id/switch-to-calxbook', asyncHandler(controller.switchTo));

  return router;
}

module.exports = { createCalxbookHandoffRouter };
