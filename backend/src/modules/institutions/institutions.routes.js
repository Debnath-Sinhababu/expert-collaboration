const express = require('express');
const upload = require('../../../middleware/upload');
const asyncHandler = require('../../shared/http/asyncHandler');
const InstitutionsController = require('./institutions.controller');

function createInstitutionsRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new InstitutionsController();

  router.get('/', asyncHandler(controller.list));
  router.post('/', upload.single('logo'), asyncHandler(controller.create));
  // Register before /:id so "user" is not captured as an id segment on shallow paths.
  router.get('/user/:userId', asyncHandler(controller.getByUserId));
  router.get('/:id', asyncHandler(controller.getById));
  router.put('/:id', upload.single('logo'), asyncHandler(controller.update));

  return router;
}

function registerInstitutionFinanceRoute(app) {
  const controller = new InstitutionsController();
  app.get(
    '/api/institution/finance/summary',
    asyncHandler(controller.financeSummary),
  );
}

module.exports = {
  createInstitutionsRouter,
  registerInstitutionFinanceRoute,
};
