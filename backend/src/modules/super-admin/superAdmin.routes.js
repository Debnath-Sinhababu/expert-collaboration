const express = require('express');
const asyncHandler = require('../../shared/http/asyncHandler');
const SuperAdminController = require('./superAdmin.controller');
const { requireSuperAdmin } = require('./superAdmin.middleware');

function createSuperAdminRouter() {
  const router = express.Router();
  const controller = new SuperAdminController();

  router.get('/me', requireSuperAdmin(), asyncHandler(controller.me));
  router.get('/overview/stats', requireSuperAdmin('overview:read'), asyncHandler(controller.overviewStats));

  router.get('/admins', requireSuperAdmin('admins:read'), asyncHandler(controller.listAdmins));
  router.post('/admins', requireSuperAdmin('admins:write'), asyncHandler(controller.createAdmin));
  router.patch('/admins/:id', requireSuperAdmin('admins:write'), asyncHandler(controller.updateAdmin));

  router.get('/profiles', requireSuperAdmin('profiles:read'), asyncHandler(controller.listProfiles));
  router.patch(
    '/experts/:id/calxbook-verification',
    requireSuperAdmin('calxbook_verification:write'),
    asyncHandler(controller.setExpertCalxbookVerification),
  );

  router.get('/requirements', requireSuperAdmin('requirements:read'), asyncHandler(controller.listRequirements));
  router.post('/requirements', requireSuperAdmin('requirements:write'), asyncHandler(controller.createRequirement));
  router.post(
    '/requirements/:id/experts',
    requireSuperAdmin('requirements:candidates'),
    asyncHandler(controller.addRequirementExpert),
  );
  router.patch(
    '/requirements/:id/experts/:candidateId',
    requireSuperAdmin('requirements:candidates'),
    asyncHandler(controller.updateRequirementExpert),
  );

  router.get('/freelance', requireSuperAdmin('freelance:read'), asyncHandler(controller.listFreelance));
  router.get('/internships', requireSuperAdmin('internships:read'), asyncHandler(controller.listInternships));
  router.get('/finance/trainings', requireSuperAdmin('finance:read'), asyncHandler(controller.listFinanceTrainings));
  router.patch(
    '/finance/trainings/:bookingId/confirm',
    requireSuperAdmin('finance:confirm'),
    asyncHandler(controller.confirmFinanceTraining),
  );

  router.post('/bulk-import/experts', requireSuperAdmin('bulk_import:write'), asyncHandler(controller.bulkImportExperts));
  router.post('/bulk-import/students', requireSuperAdmin('bulk_import:write'), asyncHandler(controller.bulkImportStudents));

  return router;
}

module.exports = {
  createSuperAdminRouter,
};
