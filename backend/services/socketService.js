const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  // Initialize Socket.IO with HTTP server and Redis adapter for scaling
  async initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    if (process.env.UPSTASH_REDIS_REST_URL && process.env.NODE_ENV === 'production') {
      try {
        const pubClient = createClient({ url: process.env.UPSTASH_REDIS_REST_URL });
        const subClient = pubClient.duplicate();
        await Promise.all([pubClient.connect(), subClient.connect()]);
        this.io.adapter(createAdapter(pubClient, subClient));
        console.log('Socket.IO Redis adapter configured for production scaling');
      } catch (error) {
        console.log('Redis adapter setup failed, continuing without scaling support:', error.message);
      }
    }

    this.setupEventHandlers();
    console.log('Socket.IO service initialized');
  }

  // Setup Socket.IO event handlers
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('New Socket.IO connection established:', socket.id);
      console.log('Total connected users:', this.connectedUsers.size);

      // Handle user authentication
      socket.on('authenticate', (data) => {
        const { userId, userType } = data;
        this.connectedUsers.set(userId, {
          socketId: socket.id,
          userType,
          connectedAt: new Date()
        });
        
        // Join user-specific room
        socket.join(`user:${userId}`);
        socket.join(`type:${userType}`);
        
        console.log(`User ${userId} (${userType}) authenticated and joined rooms`);
        
        // Send confirmation
        socket.emit('authenticated', { 
          message: 'Successfully authenticated',
          userId,
          userType
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        // Remove user from connected users
        for (const [userId, userData] of this.connectedUsers.entries()) {
          if (userData.socketId === socket.id) {
            this.connectedUsers.delete(userId);
            console.log(`User ${userId} disconnected`);
            break;
          }
        }
      });

      // Handle custom events
      socket.on('join_project_room', (projectId) => {
        socket.join(`project:${projectId}`);
        console.log(`Socket ${socket.id} joined project room: ${projectId}`);
      });

      socket.on('leave_project_room', (projectId) => {
        socket.leave(`project:${projectId}`);
        console.log(`Socket ${socket.id} left project room: ${projectId}`);
      });
    });
  }

  // Send notification to specific user
  sendToUser(userId, event, data) {
    const userData = this.connectedUsers.get(userId);
    if (userData && this.io) {
      this.io.to(userData.socketId).emit(event, data);
      console.log(`Notification sent to user ${userId}:`, event);
      return true;
    }
    console.log(`User ${userId} not connected, notification queued`);
    return false;
  }

  // Send notification to all users of a specific type
  sendToUserType(userType, event, data) {
    if (this.io) {
      this.io.to(`type:${userType}`).emit(event, data);
      console.log(`Notification sent to all ${userType}s:`, event);
      return true;
    }
    return false;
  }

  // Send notification to project room
  sendToProject(projectId, event, data) {
    if (this.io) {
      this.io.to(`project:${projectId}`).emit(event, data);
      console.log(`Notification sent to project ${projectId}:`, event);
      return true;
    }
    return false;
  }

  // Broadcast to all connected users
  broadcastToAll(event, data) {
    if (this.io) {
      this.io.emit(event, data);
      console.log(`Broadcast to all users:`, event);
      return true;
    }
    return false;
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get connected users info
  getConnectedUsers() {
    return Array.from(this.connectedUsers.entries()).map(([userId, data]) => ({
      userId,
      userType: data.userType,
      connectedAt: data.connectedAt
    }));
  }

  // Check if user is connected
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  sendExpertApplicationNotification(institutionUserId, projectTitle, expertName) {
    return this.sendToUser(institutionUserId, 'new_application', {
      type: 'expert_applied',
      projectTitle: projectTitle,
      expertName: expertName,
      message: `New expert application for project: ${projectTitle}`
    });
  }

  sendApplicationStatusNotification(expertId, projectTitle, status) {
    return this.sendToUser(expertId, 'application_status_changed', {
      type: status === 'accepted' ? 'application_accepted' : 'application_rejected',
      projectTitle: projectTitle,
      status: status,
      message: `Your application for "${projectTitle}" has been ${status}`
    });
  }

  sendBookingNotification(expertId, projectTitle, institutionName, isCreation = false) {
    const eventType = isCreation ? 'booking_created' : 'booking_updated';
    const message = isCreation ? 
      `New booking created for project: ${projectTitle}` : 
      `Booking updated for project: ${projectTitle}`;
    
    return this.sendToUser(expertId, eventType, {
      type: eventType,
      projectTitle: projectTitle,
      institutionName: institutionName,
      message: message
    });
  }
}

module.exports = new SocketService();
