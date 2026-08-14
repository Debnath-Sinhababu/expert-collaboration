const express = require('express');
const asyncHandler = require('../../shared/http/asyncHandler');
const OnboardingController = require('./onboarding.controller');

function createOnboardingRouter() {
  const router = express.Router();
  const controller = new OnboardingController();

  router.get('/', asyncHandler(controller.list));
  router.get('/:id', asyncHandler(controller.getById));
  router.post('/:id/accept', asyncHandler(controller.accept));
  router.post('/:id/decline', asyncHandler(controller.decline));

  return router;
}

module.exports = { createOnboardingRouter };
