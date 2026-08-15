const express = require('express');
const upload = require('../../../middleware/upload');
const asyncHandler = require('../../shared/http/asyncHandler');
const ProjectsController = require('./projects.controller');

function optionalRequirementPdfUpload(req, res, next) {
  const contentType = String(req.headers['content-type'] || '');
  if (contentType.includes('multipart/form-data')) {
    return upload.fields([{ name: 'requirement_pdf', maxCount: 1 }])(req, res, next);
  }
  return next();
}

function createProjectsRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new ProjectsController();

  router.get('/', asyncHandler(controller.list));
  router.get('/types', asyncHandler(controller.listTypes));
  router.get('/counts', asyncHandler(controller.counts));
  router.post(
    '/',
    upload.fields([{ name: 'requirement_pdf', maxCount: 1 }]),
    asyncHandler(controller.create),
  );
  router.get('/recommended/:expertId', asyncHandler(controller.listRecommended));
  router.get('/:id/edit-request', asyncHandler(controller.getEditRequest));
  router.get('/:id', asyncHandler(controller.getById));
  router.put('/:id', optionalRequirementPdfUpload, asyncHandler(controller.update));

  return router;
}

module.exports = {
  createProjectsRouter,
  optionalRequirementPdfUpload,
};
