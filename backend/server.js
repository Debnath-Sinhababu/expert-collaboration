const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const upload = require('./middleware/upload');

dotenv.config();

// Import services after environment variables are loaded
const notificationService = require('./services/notificationService');
const socketService = require('./services/socketService');
const {
  syncProjectStatusesDue,
} = require('./src/shared/projectStatus');
const { createApp, applyFinalErrorHandlers } = require('./src/app');
const { registerModularRoutes } = require('./src/routes');
const { normalizePan, isValidPan } = require('./src/shared/pan');

console.log('Environment variables loaded:');
console.log('UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Not set');
console.log('UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Not set');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
console.log('EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? 'Set' : 'Not set');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set');

const app = createApp();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

// ========================================
// Modular MVC routes (extracted domains)
// ========================================
registerModularRoutes(app, {
  upload,
  normalizePan,
  isValidPan,
});

applyFinalErrorHandlers(app);

// Initialize Socket.IO
socketService.initialize(server);

// Start notification queue processor
notificationService.startQueueProcessor();

// Periodic project status sync (date-based open→running / →completed). Independent of bookings.
function runProjectStatusSync(reason = 'interval') {
  try {
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    syncProjectStatusesDue(serviceClient)
      .then((result) => {
        if (result.runningUpdated || result.completedUpdated) {
          console.log(`[projectStatus] ${reason}:`, result);
        }
      })
      .catch((err) => console.warn(`[projectStatus] ${reason} failed:`, err?.message || err));
  } catch (err) {
    console.warn(`[projectStatus] ${reason} setup failed:`, err?.message || err);
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Socket.IO service initialized');
  console.log('Notification queue processor started');
  console.log('Environment variables check:');
  console.log('- EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
  console.log('- EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? 'Set' : 'Not set');
  console.log('- UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Not set');
  console.log('- UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Not set');
  runProjectStatusSync('startup');
  setInterval(() => runProjectStatusSync('hourly'), 60 * 60 * 1000);
});

module.exports = app;
