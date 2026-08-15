const { createInstitutionsRouter, registerInstitutionFinanceRoute } = require('../modules/institutions/institutions.routes');
const { createAuthRouter, registerHealthRoutes } = require('../modules/auth/auth.routes');
const { createExpertsRouter, registerExpertExtraRoutes } = require('../modules/experts/experts.routes');
const { createProjectsRouter } = require('../modules/projects/projects.routes');
const { createSuperAdminRouter } = require('../modules/super-admin/superAdmin.routes');
const { createApplicationsRouter } = require('../modules/applications/applications.routes');
const { createBookingsRouter } = require('../modules/bookings/bookings.routes');
const { createRatingsRouter } = require('../modules/ratings/ratings.routes');
const { createStudentsRouter, registerStudentFeedbackRoutes } = require('../modules/students/students.routes');
const {
  createInternshipsRouter,
  createInternshipApplicationsRouter,
} = require('../modules/internships/internships.routes');
const { createFreelanceRouter } = require('../modules/freelance/freelance.routes');
const { createLegacyAdminRouter } = require('../modules/legacy-admin/legacyAdmin.routes');
const { registerSuperAdminExpertMutations } = require('../../routes/superadminExpertMutations');
const { registerTrainingAttendanceRoutes } = require('../../routes/trainingAttendanceRoutes');
const { setupContactRoutes } = require('../../routes/contact');

/**
 * Mount extracted MVC / route modules.
 * Add new domains here as they leave server.js — one domain per PR.
 *
 * @param {import('express').Express} app
 * @param {{ upload: object, normalizePan?: Function, isValidPan?: Function }} deps
 */
function registerModularRoutes(app, deps = {}) {
  const { upload, normalizePan, isValidPan } = deps;

  // Auth + health
  registerHealthRoutes(app);
  app.use('/api/auth', createAuthRouter());

  // Institutions
  app.use('/api/institutions', createInstitutionsRouter());
  registerInstitutionFinanceRoute(app);

  // Experts (+ calxbook sync, finance summary, availability)
  app.use('/api/experts', createExpertsRouter());
  registerExpertExtraRoutes(app);

  // Projects
  app.use('/api/projects', createProjectsRouter());

  // Applications (CRUD + rate/lock)
  app.use('/api/applications', createApplicationsRouter());

  // Bookings (CRUD + completion/cancellation; attendance registered below)
  app.use('/api/bookings', createBookingsRouter());

  // Ratings
  app.use('/api/ratings', createRatingsRouter());

  // Students (portal profiles + feedback system under /api/student)
  app.use('/api/students', createStudentsRouter());
  registerStudentFeedbackRoutes(app);

  // Internships (+ applications)
  app.use('/api/internships', createInternshipsRouter());
  app.use('/api/internship-applications', createInternshipApplicationsRouter());

  // Freelance
  app.use('/api/freelance', createFreelanceRouter());

  // Legacy /api/admin (gate applied in src/app.js)
  app.use('/api/admin', createLegacyAdminRouter());

  // Already-extracted modules
  app.use('/api/superadmin', createSuperAdminRouter());

  if (upload && normalizePan && isValidPan) {
    registerSuperAdminExpertMutations(app, { upload, normalizePan, isValidPan });
  }

  if (upload) {
    registerTrainingAttendanceRoutes(app, upload);
  }

  setupContactRoutes(app);
}

module.exports = {
  registerModularRoutes,
};
