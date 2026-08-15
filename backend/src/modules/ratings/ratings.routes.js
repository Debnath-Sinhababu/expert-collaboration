const express = require('express');
const asyncHandler = require('../../shared/http/asyncHandler');
const RatingsController = require('./ratings.controller');

function createRatingsRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new RatingsController();

  router.get('/', asyncHandler(controller.list));
  router.post('/', asyncHandler(controller.create));

  return router;
}

module.exports = { createRatingsRouter };
