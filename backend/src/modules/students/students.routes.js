const express = require('express');
const upload = require('../../../middleware/upload');
const asyncHandler = require('../../shared/http/asyncHandler');
const StudentsController = require('./students.controller');

const STUDENT_UPLOAD_FIELDS = [
  { name: 'resume', maxCount: 1 },
  { name: 'profile_photo', maxCount: 1 },
  { name: 'documents', maxCount: 1 },
];

function createStudentsRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new StudentsController();

  router.get('/me', asyncHandler(controller.me));
  router.get('/featured', asyncHandler(controller.listFeatured));
  router.get('/', asyncHandler(controller.list));
  router.post('/', upload.fields(STUDENT_UPLOAD_FIELDS), asyncHandler(controller.create));
  router.put('/:id', upload.fields(STUDENT_UPLOAD_FIELDS), asyncHandler(controller.update));

  return router;
}

/** Feedback portal routes under /api/student (singular). */
function registerStudentFeedbackRoutes(app) {
  const controller = new StudentsController();

  app.post('/api/student/login', asyncHandler(controller.login));
  app.get('/api/student/sessions', asyncHandler(controller.sessions));
  app.get('/api/student/feedback-status', asyncHandler(controller.feedbackStatus));
  app.post('/api/student/feedback', asyncHandler(controller.submitFeedback));
  app.get('/api/student/feedback/by-expert', asyncHandler(controller.feedbackByExpert));
}

module.exports = {
  createStudentsRouter,
  registerStudentFeedbackRoutes,
  STUDENT_UPLOAD_FIELDS,
};
