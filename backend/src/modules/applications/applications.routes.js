const express = require('express');
const asyncHandler = require('../../shared/http/asyncHandler');
const ApplicationsController = require('./applications.controller');
const ApplicationRateController = require('./applicationRate.controller');

/**
 * Combined applications router: CRUD + rate/lock (same /api/applications mount).
 * Rate routes stay more specific than PUT /:id.
 */
function createApplicationsRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new ApplicationsController();
  const rateController = new ApplicationRateController();

  router.get('/', asyncHandler(controller.list));
  router.get('/counts', asyncHandler(controller.counts));
  router.post('/', asyncHandler(controller.create));
  router.put('/:id/rate', asyncHandler(rateController.updateRate));
  router.post('/:id/confirm-lock', asyncHandler(rateController.confirmLock));
  router.put('/:id', asyncHandler(controller.update));

  return router;
}

/** @deprecated Prefer createApplicationsRouter — kept for callers that only need rate routes. */
function createApplicationRateRouter() {
  const router = express.Router({ mergeParams: true });
  const rateController = new ApplicationRateController();
  router.put('/:id/rate', asyncHandler(rateController.updateRate));
  router.post('/:id/confirm-lock', asyncHandler(rateController.confirmLock));
  return router;
}

module.exports = {
  createApplicationsRouter,
  createApplicationRateRouter,
};
