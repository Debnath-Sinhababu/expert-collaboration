const express = require('express');
const upload = require('../../../middleware/upload');
const asyncHandler = require('../../shared/http/asyncHandler');
const ExpertsController = require('./experts.controller');
const { registerExpertAvailabilityRoutes } = require('./experts.availability.routes');

const EXPERT_UPLOAD_FIELDS = [
  { name: 'profile_photo', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'qualifications', maxCount: 1 },
  { name: 'profile_video', maxCount: 1 },
  { name: 'course_video', maxCount: 1 },
  { name: 'cancelled_cheque', maxCount: 1 },
];

function createExpertsRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new ExpertsController();

  router.get('/', asyncHandler(controller.list));
  router.post('/', upload.fields(EXPERT_UPLOAD_FIELDS), asyncHandler(controller.create));
  router.get('/user/:userId', asyncHandler(controller.getByUserId));
  router.get('/recommended/:projectId', asyncHandler(controller.listRecommended));
  router.put('/:id/calxbook-visibility', asyncHandler(controller.setCalxbookVisibility));
  router.get('/:id', asyncHandler(controller.getById));
  router.put('/:id', upload.fields(EXPERT_UPLOAD_FIELDS), asyncHandler(controller.update));

  return router;
}

function registerExpertExtraRoutes(app) {
  const controller = new ExpertsController();
  app.get('/api/expert/finance/summary', asyncHandler(controller.financeSummary));
  app.get('/api/calxbook/experts', asyncHandler(controller.listCalxbook));
  registerExpertAvailabilityRoutes(app);
}

module.exports = {
  createExpertsRouter,
  registerExpertExtraRoutes,
  EXPERT_UPLOAD_FIELDS,
};
