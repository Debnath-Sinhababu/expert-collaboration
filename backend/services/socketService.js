const { Server } = require('socket.io');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // Map to store user connections
  }

  // Initialize Socket.IO with HTTP server
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.setupEventHandlers();
    console.log('Socket.IO service initialized');
  }

  // Setup Socket.IO event handlers
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

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
}

module.exports = new SocketService();
