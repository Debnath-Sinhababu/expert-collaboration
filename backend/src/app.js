const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const superAdminAuth = require('../auth/superAdminAuth');

const CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
  'https://calxmap.in',
  'https://www.calxmap.in',
  'expert-collaboration.vercel.app',
  'https://expert-collaboration-g75b.onrender.com',
  'https://qa.calxmap.in',
  'https://qa.calxmap.com',
].filter(Boolean);

/**
 * Core Express middleware shared by all routes.
 * Domain routers are mounted separately via src/routes/index.js.
 */
function applyCoreMiddleware(app) {
  app.use(helmet());
  app.use(
    cors({
      origin: CORS_ORIGINS,
      credentials: true,
    }),
  );
  app.use(morgan('combined'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
}

/**
 * Legacy /api/admin gate (JWT super_admin), excluding feedback-analytics.
 */
function applyLegacyAdminGate(app) {
  app.use('/api/admin', async (req, res, next) => {
    if (req.path.startsWith('/feedback-analytics')) return next();

    const auth = await superAdminAuth.requireSuperAdmin(req, res);
    if (!auth) return;
    req.legacyAdmin = auth;
    next();
  });
}

function applyFinalErrorHandlers(app) {
  app.use((err, req, res, next) => {
    console.error(err.stack || err);
    if (res.headersSent) return next(err);
    res.status(err.statusCode || err.status || 500).json({
      error: err.message || 'Something went wrong!',
    });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

/**
 * Create Express app with core middleware + legacy admin gate.
 * Domain routers mount via registerModularRoutes; then applyFinalErrorHandlers.
 */
function createApp() {
  const app = express();
  applyCoreMiddleware(app);
  applyLegacyAdminGate(app);
  return app;
}

module.exports = {
  createApp,
  applyCoreMiddleware,
  applyLegacyAdminGate,
  applyFinalErrorHandlers,
  CORS_ORIGINS,
};
