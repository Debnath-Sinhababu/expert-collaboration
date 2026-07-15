const express = require('express');
const asyncHandler = require('../../shared/http/asyncHandler');
const ApplicationRateController = require('./applicationRate.controller');

function createApplicationRateRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new ApplicationRateController();

  router.put('/:id/rate', asyncHandler(controller.updateRate));
  router.post('/:id/confirm-lock', asyncHandler(controller.confirmLock));

  return router;
}

module.exports = { createApplicationRateRouter };
