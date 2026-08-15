const express = require('express');
const upload = require('../../../middleware/upload');
const asyncHandler = require('../../shared/http/asyncHandler');
const LegacyAdminController = require('./legacyAdmin.controller');

const ADMIN_EXPERT_UPLOAD_FIELDS = [
  { name: 'profile_photo', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'qualifications', maxCount: 1 },
  { name: 'profile_video', maxCount: 1 },
];

function createLegacyAdminRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new LegacyAdminController();

  router.get('/feedback-analytics', asyncHandler(controller.feedbackAnalytics));
  router.get('/profiles/experts', asyncHandler(controller.listExperts));
  router.get('/profiles/institutions', asyncHandler(controller.listInstitutions));
  router.get('/profiles/students', asyncHandler(controller.listStudents));
  router.post(
    '/experts',
    upload.fields(ADMIN_EXPERT_UPLOAD_FIELDS),
    asyncHandler(controller.createExpert),
  );
  router.post('/experts/bulk-import', asyncHandler(controller.bulkImportExperts));
  router.get('/super-admins', asyncHandler(controller.listSuperAdmins));
  router.post('/super-admins/create', asyncHandler(controller.createSuperAdmin));
  router.post('/super-admins/promote', asyncHandler(controller.promoteSuperAdmin));
  router.get('/custom-domains', asyncHandler(controller.listCustomDomains));
  router.get('/requirements', asyncHandler(controller.listRequirements));
  router.patch('/requirements/:id/status', asyncHandler(controller.updateRequirementStatus));

  return router;
}

module.exports = {
  createLegacyAdminRouter,
  ADMIN_EXPERT_UPLOAD_FIELDS,
};
