const express = require('express');
const asyncHandler = require('../../shared/http/asyncHandler');
const InternshipsController = require('./internships.controller');

function createInternshipsRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new InternshipsController();

  router.post('/', asyncHandler(controller.create));
  router.get('/', asyncHandler(controller.list));
  router.get('/visible', asyncHandler(controller.listVisible));
  router.get(
    '/:id/applications/institution',
    asyncHandler(controller.listApplicationsForInstitution),
  );
  router.get('/:id/applications', asyncHandler(controller.listApplicationsForInternship));
  router.get('/:id', asyncHandler(controller.getById));

  return router;
}

function createInternshipApplicationsRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new InternshipsController();

  router.get('/status', asyncHandler(controller.getApplicationStatus));
  router.get('/', asyncHandler(controller.listMyApplications));
  router.post('/', asyncHandler(controller.apply));
  router.put('/:id/status', asyncHandler(controller.updateApplicationStatus));
  router.put('/:id/institution-status', asyncHandler(controller.updateInstitutionStatus));

  return router;
}

module.exports = {
  createInternshipsRouter,
  createInternshipApplicationsRouter,
};
