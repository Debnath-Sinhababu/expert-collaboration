// services/socketService.js
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

class SocketService {
  constructor() {
    this.io = null;
    this.redis = null;          // redis client for commands
    this.pubClient = null;      // redis pub client (for adapter)
    this.subClient = null;      // redis sub client (for adapter)
    this.PENDING_NOTIF_TTL = 60 * 60 * 24 * 30; // 30 days (adjust)
  }

  async initialize(server) {
    // init Socket.IO
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      // pingTimeout/pingInterval can be tuned
    });

    // Setup Redis connections (use one URL env var)
    let redisUrl = process.env.UPSTASH_REDIS_REST_URL
    if(process.env.NODE_ENV === 'production'){
     redisUrl = process.env.REDIS_URL
    }
    if (!redisUrl) {
      console.warn('No REDIS_URL found — continuing without Redis adapter (not recommended for production)');
      this.setupEventHandlers();
      return;
    }

    try {
      // Command client
      this.redis = createClient({ url: redisUrl });
      this.redis.on('error', (err) => console.error('Redis command client error', err));
      await this.redis.connect();

      // Adapter pub/sub clients
      this.pubClient = createClient({ url: redisUrl });
      this.subClient = this.pubClient.duplicate();

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
      this.io.adapter(createAdapter(this.pubClient, this.subClient));

      console.log('Socket.IO Redis adapter configured');
    } catch (err) {
      console.error('Failed to setup Redis for Socket.IO adapter:', err);
      // if redis fails, you can fall back to single-instance mode
    }

    this.setupEventHandlers();
    console.log('Socket.IO service initialized');
  }

  setupEventHandlers() {
    if (!this.io) throw new Error('Socket.IO not initialized');

    this.io.on('connection', (socket) => {
      console.log('New connection:', socket.id);

      // auth / identify user and join rooms
      socket.on('authenticate', async (data) => {
        try {
          const { userId, userType } = data;
          if (!userId) {
            socket.emit('authenticated', { success: false, message: 'userId required' });
            return;
          }

          // join per-user room (Socket.IO + Redis adapter will handle routing)
          socket.join(`user:${userId}`);
          if (userType) socket.join(`type:${userType}`);

          // Persist mapping in Redis:
          // store socket -> user, and add socket to user's set
          if (this.redis) {
            await this.redis.set(`socketUser:${socket.id}`, userId, { EX: this.PENDING_NOTIF_TTL });
            await this.redis.sAdd(`userSockets:${userId}`, socket.id);
          }

          // send confirmation
          socket.emit('authenticated', { message: 'Successfully authenticated', userId, userType });

          // flush any pending notifications from Redis
          await this._deliverPendingNotifications(userId);
          console.log(`User ${userId} authenticated on socket ${socket.id}`);
        } catch (err) {
          console.error('authenticate handler error', err);
        }
      });

      // project room join/leave
      socket.on('join_project_room', (projectId) => {
        if (!projectId) return;
        socket.join(`project:${projectId}`);
        console.log(`Socket ${socket.id} joined project:${projectId}`);
      });

      socket.on('leave_project_room', (projectId) => {
        if (!projectId) return;
        socket.leave(`project:${projectId}`);
        console.log(`Socket ${socket.id} left project:${projectId}`);
      });

      // on disconnect: cleanup redis mappings
      socket.on('disconnect', async (reason) => {
        console.log(`Socket disconnected: ${socket.id} (${reason})`);
        try {
          if (!this.redis) return;

          const userId = await this.redis.get(`socketUser:${socket.id}`);
          if (userId) {
            // remove this socket from user's set
            await this.redis.sRem(`userSockets:${userId}`, socket.id);
            // delete reverse mapping
            await this.redis.del(`socketUser:${socket.id}`);

            // optional: if userSockets set empty, you may mark user offline
            const remaining = await this.redis.sCard(`userSockets:${userId}`);
            if (remaining === 0) {
              console.log(`User ${userId} appears offline (no sockets remaining)`);
            }
          }
        } catch (err) {
          console.error('disconnect cleanup error', err);
        }
      });

      // (Add other event handlers here: messages, typing, etc.)
    });
  }

  // ----------------------
  // Notification helpers
  // ----------------------

  // deliver pending notifications stored in Redis list
  async _deliverPendingNotifications(userId) {
    if (!this.redis) return;
    const key = `pendingNotifications:${userId}`;
    try {
      // get all pending (LRANGE)
      const pending = await this.redis.lRange(key, 0, -1);
      if (!pending || pending.length === 0) return;

      for (const item of pending) {
        try {
          const { event, data } = JSON.parse(item);
          // emit to user room — Redis adapter will reach correct instance(s)
          this.io.to(`user:${userId}`).emit(event, data);
        } catch (err) {
          console.error('Failed to parse pending notification', err);
        }
      }
      // clear pending list
      await this.redis.del(key);
      console.log(`Delivered ${pending.length} pending notifications to user ${userId}`);
    } catch (err) {
      console.error('Error delivering pending notifications', err);
    }
  }

  // queue notification if user not connected
  async _queueNotification(userId, event, data) {
    if (!this.redis) return;
    const key = `pendingNotifications:${userId}`;
    const payload = JSON.stringify({ event, data, ts: Date.now() });
    await this.redis.rPush(key, payload);
    // optionally set TTL so pending notifications don't pile up forever
    await this.redis.expire(key, this.PENDING_NOTIF_TTL);
  }

  // public: send to a single user (uses room emission, falls back to queue)
  async sendToUser(userId, event, data) {
   
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return false;
    }

    try {
      // Check if any sockets exist for user by checking Redis set (if available)
      if (this.redis) {
        const count = await this.redis.sCard(`userSockets:${userId}`);
        if (count > 0) {
          this.io.to(`user:${userId}`).emit(event, data);
          console.log(`Notification emitted to user:${userId} -> ${event}`);
          return true;
        } else {
          console.log(`User ${userId} not connected, queueing notification`);
          await this._queueNotification(userId, event, data);
          return false;
        }
      } else {
        // Without Redis: try emitting anyway (works on single instance)
        this.io.to(`user:${userId}`).emit(event, data);
        console.log(`(No Redis) Notification emitted to user:${userId} -> ${event}`);
        return true;
      }
    } catch (err) {
      console.error('sendToUser error', err);
      return false;
    }
  }

  // Send to users by type (room emission)
  sendToUserType(userType, event, data) {
    if (!this.io) return false;
    this.io.to(`type:${userType}`).emit(event, data);
    console.log(`Notification emitted to type:${userType} -> ${event}`);
    return true;
  }

  // Send to project room
  sendToProject(projectId, event, data) {
    if (!this.io) return false;
    this.io.to(`project:${projectId}`).emit(event, data);
    console.log(`Notification emitted to project:${projectId} -> ${event}`);
    return true;
  }

  broadcastToAll(event, data) {
    if (!this.io) return false;
    this.io.emit(event, data);
    console.log(`Broadcast -> ${event}`);
    return true;
  }

  // useful admin helpers
  async getConnectedUsersCount() {
    if (this.redis) {
      // sum over keys pattern: userSockets:* — this can be costly; consider a leaderboard key for scale
      const keys = await this.redis.keys('userSockets:*');
      let total = 0;
      for (const k of keys) {
        total += await this.redis.sCard(k);
      }
      return total;
    }
    return 0;
  }

  // Example domain-specific notifications
  async sendExpertApplicationNotification(institutionUserId, projectTitle, expertName) {
    return this.sendToUser(institutionUserId, 'new_application', {
      type: 'expert_applied',
      projectTitle,
      expertName,
      message: `New expert application for project: ${projectTitle}`,
    });
  }

  async sendApplicationStatusNotification(expertId, projectTitle, status, projectId) {
    if (status === 'rejected') {
      // Per requirement: no notification on rejection
      return true;
    }
    if (status === 'interview') {
      console.log('interview reached')
      return this.sendToUser(expertId, 'moved_to_interview', {
        type: 'moved_to_interview',
        projectTitle,
        projectId,
        message: `Your application for "${projectTitle}" is now in the interview stage. Tap to view details.`,
      });
    }
    if (status === 'accepted') {
      // Accepted will be followed by booking creation flow which sends booking_created
      return this.sendToUser(expertId, 'application_status_changed', {
        type: 'application_accepted',
        projectTitle,
        projectId,
        message: `You're selected for "${projectTitle}". Booking will be created shortly.`,
      });
    }
    // default fallback
    return this.sendToUser(expertId, 'application_status_changed', {
      type: 'application_status_changed',
      projectTitle,
      projectId,
      status,
      message: `Your application for "${projectTitle}" has been updated to ${status}.`,
    });
  }

  async sendBookingNotification(expertId, projectTitle, institutionName, projectId=null, isCreation = false) {
    const eventType = isCreation ? 'booking_created' : 'booking_updated';
    const message = isCreation ? `New booking created for project: ${projectTitle}` : `Booking completed for project: ${projectTitle}`;
    return this.sendToUser(expertId, eventType, {
      type: eventType,
      projectTitle,
      projectId,
      message,
    });
  }

  async sendExpertSelectedWithBookingNotification(expertId, projectTitle, institutionName, projectId) {
    return this.sendToUser(expertId, 'expert_selected_with_booking', {
      type: 'expert_selected_with_booking',
      projectTitle,
      institutionName,
      projectId,
      message: `Congratulations! You've been selected for project: ${projectTitle}`,
    });
  }

  async sendExpertInterestShownNotification(expertId, projectTitle, institutionName,projectId) {
    return this.sendToUser(expertId, 'expert_interest_shown', {
      type: 'expert_interest_shown',
      projectTitle,
      institutionName,
      projectId,
      message: `An institution is interested in your profile for: ${projectTitle}. Tap to view details.`,
    });
  }
}

module.exports = new SocketService();
