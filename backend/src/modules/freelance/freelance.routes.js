const express = require('express');
const upload = require('../../../middleware/upload');
const asyncHandler = require('../../shared/http/asyncHandler');
const FreelanceController = require('./freelance.controller');

function createFreelanceRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new FreelanceController();

  // Public list at /api/freelance
  router.get('/', asyncHandler(controller.listPublic));

  // Projects
  router.post(
    '/projects',
    upload.fields([{ name: 'draft', maxCount: 1 }]),
    asyncHandler(controller.createProject),
  );
  router.get('/projects', asyncHandler(controller.listProjects));
  router.get('/projects/visible', asyncHandler(controller.listVisibleProjects));
  router.get('/projects/:id/applications', asyncHandler(controller.listProjectApplications));
  router.get('/projects/:id/submissions', asyncHandler(controller.listProjectSubmissions));
  router.get('/projects/:id', asyncHandler(controller.getProjectById));

  // Applications
  router.post('/applications', asyncHandler(controller.apply));
  router.get('/applications/status', asyncHandler(controller.getApplicationStatus));
  router.put('/applications/:id/status', asyncHandler(controller.updateApplicationStatus));
  router.get('/my-applications', asyncHandler(controller.listMyApplications));

  // Submissions
  router.post(
    '/submissions',
    upload.fields([{ name: 'attachment', maxCount: 1 }]),
    asyncHandler(controller.createSubmission),
  );
  router.get('/my-submissions', asyncHandler(controller.listMySubmissions));

  return router;
}

module.exports = { createFreelanceRouter };
