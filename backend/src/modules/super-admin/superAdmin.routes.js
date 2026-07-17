const express = require('express');
const upload = require('../../../middleware/upload');
const asyncHandler = require('../../shared/http/asyncHandler');
const SuperAdminController = require('./superAdmin.controller');
const { requireSuperAdmin } = require('./superAdmin.middleware');

function createSuperAdminRouter() {
  const router = express.Router();
  const controller = new SuperAdminController();

  router.get('/me', requireSuperAdmin(), asyncHandler(controller.me));
  router.get('/overview/stats', requireSuperAdmin('overview:read'), asyncHandler(controller.overviewStats));
  router.get('/overview/export', requireSuperAdmin('exports:download'), asyncHandler(controller.exportOverview));
  router.get('/overview/:category', requireSuperAdmin('overview:read'), asyncHandler(controller.overviewCategory));

  router.get('/admins', requireSuperAdmin('admins:read'), asyncHandler(controller.listAdmins));
  router.post('/admins', requireSuperAdmin('admins:write'), asyncHandler(controller.createAdmin));
  router.get('/admins/:id/activity/export', requireSuperAdmin(['activity:read', 'exports:download']), asyncHandler(controller.exportAdminActivity));
  router.get('/admins/:id/activity', requireSuperAdmin('activity:read'), asyncHandler(controller.listAdminActivity));
  router.get('/admins/:id', requireSuperAdmin('admins:read'), asyncHandler(controller.getAdminDetail));
  router.patch('/admins/:id', requireSuperAdmin('admins:write'), asyncHandler(controller.updateAdmin));

  router.get('/profiles', requireSuperAdmin('profiles:read'), asyncHandler(controller.listProfiles));
  router.patch(
    '/experts/:id/calxbook-verification',
    requireSuperAdmin('calxbook_verification:write'),
    asyncHandler(controller.setExpertCalxbookVerification),
  );

  router.get('/requirements', requireSuperAdmin('requirements:read'), asyncHandler(controller.listRequirements));
  router.get('/requirements/assigned', requireSuperAdmin(['assignments:read', 'daily_reports:write']), asyncHandler(controller.listAssignedRequirements));
  router.post(
    '/requirements',
    requireSuperAdmin('requirements:write'),
    upload.fields([
      { name: 'requirement_pdf', maxCount: 1 },
      { name: 'draft', maxCount: 1 },
    ]),
    asyncHandler(controller.createRequirement),
  );
  router.get(
    '/requirements/:type/:id',
    requireSuperAdmin(['requirements:read', 'freelance:read', 'internships:read']),
    asyncHandler(controller.getRequirementDetail),
  );
  router.post(
    '/requirements/:type/:id/assignment',
    requireSuperAdmin('assignments:write'),
    asyncHandler(controller.assignRequirement),
  );
  router.delete(
    '/requirements/:type/:id/assignment',
    requireSuperAdmin('assignments:write'),
    asyncHandler(controller.unassignRequirement),
  );
  router.get(
    '/requirements/:type/:id/reports',
    requireSuperAdmin('daily_reports:read'),
    asyncHandler(controller.listRequirementReports),
  );
  router.post(
    '/requirements/:type/:id/reports',
    requireSuperAdmin('daily_reports:write'),
    upload.fields([{ name: 'report', maxCount: 1 }, { name: 'document', maxCount: 1 }, { name: 'file', maxCount: 1 }]),
    asyncHandler(controller.createRequirementReport),
  );
  router.post(
    '/requirements/:id/experts',
    requireSuperAdmin(['requirements:candidates', 'freelance:write', 'internships:write']),
    asyncHandler(controller.addRequirementExpert),
  );
  router.patch(
    '/requirements/:id/experts/:candidateId',
    requireSuperAdmin(['requirements:candidates', 'freelance:write', 'internships:write']),
    asyncHandler(controller.updateRequirementExpert),
  );
  router.post(
    '/requirements/:id/experts/:candidateId/action',
    requireSuperAdmin(['requirements:candidates', 'freelance:write', 'internships:write']),
    asyncHandler(controller.runRequirementExpertAction),
  );
  router.patch(
    '/requirements/:type/:id/applications/:applicationId',
    requireSuperAdmin(['requirements:candidates', 'requirements:write', 'freelance:write', 'internships:write']),
    asyncHandler(controller.updateNativeRequirementApplication),
  );
  router.patch(
    '/requirements/:type/:id/bookings/:bookingId',
    requireSuperAdmin(['requirements:candidates', 'requirements:write']),
    asyncHandler(controller.updateRequirementBooking),
  );
  router.patch(
    '/requirements/:type/:id/dates',
    requireSuperAdmin('requirements:write'),
    asyncHandler(controller.updateRequirementDates),
  );
  router.patch(
    '/requirements/:type/:id/status',
    requireSuperAdmin('requirements:write'),
    asyncHandler(controller.updateRequirementStatus),
  );
  router.patch(
    '/requirements/:type/:id/edit-requests/:requestId',
    requireSuperAdmin('requirements:write'),
    asyncHandler(controller.reviewProjectEditRequest),
  );

  router.get('/freelance', requireSuperAdmin('freelance:read'), asyncHandler(controller.listFreelance));
  router.get('/internships', requireSuperAdmin('internships:read'), asyncHandler(controller.listInternships));
  router.get('/finance/summary', requireSuperAdmin('finance:read'), asyncHandler(controller.financeSummary));
  router.get('/finance/payments', requireSuperAdmin('finance:read'), asyncHandler(controller.listFinancePayments));
  router.get('/finance/payments/:id', requireSuperAdmin('finance:read'), asyncHandler(controller.getFinancePayment));
  router.patch('/finance/payments/:id', requireSuperAdmin('finance:write'), asyncHandler(controller.updateFinancePaymentAdjustment));
  router.post('/finance/payments/:id/invoice', requireSuperAdmin('finance:confirm'), asyncHandler(controller.sendFinanceInvoice));
  router.patch('/finance/payments/:id/mark-paid', requireSuperAdmin('finance:confirm'), asyncHandler(controller.markFinancePaymentPaid));
  router.get('/finance/invoices', requireSuperAdmin('finance:read'), asyncHandler(controller.listFinanceInvoices));
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
