const express = require('express');
const asyncHandler = require('../../shared/http/asyncHandler');
const AuthController = require('./auth.controller');

function createAuthRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new AuthController();

  router.post('/register', asyncHandler(controller.register));
  router.post('/confirm-email', asyncHandler(controller.confirmEmail));
  router.post('/forgot-password', asyncHandler(controller.forgotPassword));
  router.post('/password-reset/confirm', asyncHandler(controller.confirmPasswordReset));

  return router;
}

function registerHealthRoutes(app) {
  const controller = new AuthController();
  app.get('/api/health', asyncHandler(controller.healthLive));
  app.get('/api/health-static', controller.healthStatic);
}

module.exports = {
  createAuthRouter,
  registerHealthRoutes,
};
