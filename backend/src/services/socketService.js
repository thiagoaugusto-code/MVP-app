const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> Set of socketIds
    this.socketUsers = new Map(); // socketId -> userId
  }

  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5174",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.io.use(this.authenticateSocket.bind(this));
    this.setupEventHandlers();

    console.log('Socket.io initialized');
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      socket.userId = decoded.id;
      socket.userRole = decoded.role;

      next();
    } catch (error) {
      console.error('Socket authentication failed:', error.message);
      next(new Error('Authentication failed'));
    }
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected with socket ${socket.id}`);

      // Track user connections
      this.trackUserConnection(socket.userId, socket.id);

      // Join user-specific room
      socket.join(`user_${socket.userId}`);

      // Handle chat events
      this.handleChatEvents(socket);

      // Handle presence events
      this.handlePresenceEvents(socket);

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected from socket ${socket.id}`);
        this.trackUserDisconnection(socket.userId, socket.id);
      });
    });
  }

  handleChatEvents(socket) {
    // Join conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`User ${socket.userId} joined conversation ${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, type = 'text', metadata = {} } = data;

        // Save message to database
        const message = await prisma.message.create({
          data: {
            conversationId: parseInt(conversationId),
            senderId: socket.userId,
            content,
            type,
            metadata: JSON.stringify(metadata)
          },
          include: {
            sender: {
              select: { id: true, name: true, email: true }
            }
          }
        });

        // Emit to conversation room
        this.io.to(`conversation_${conversationId}`).emit('new_message', {
          ...message,
          metadata: JSON.parse(message.metadata)
        });

        // Update conversation last message
        await prisma.conversation.update({
          where: { id: parseInt(conversationId) },
          data: {
            lastMessage: content,
            lastMessageAt: new Date()
          }
        });

        // Notify other participants about unread messages
        const conversation = await prisma.conversation.findUnique({
          where: { id: parseInt(conversationId) },
          include: { student: true, collaborator: true }
        });

        const otherParticipantId = conversation.studentId === socket.userId
          ? conversation.collaboratorId
          : conversation.studentId;

        this.notifyUser(otherParticipantId, 'unread_message', {
          conversationId,
          senderId: socket.userId,
          content: content.substring(0, 50)
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Mark messages as read
    socket.on('mark_read', async (conversationId) => {
      try {
        await prisma.message.updateMany({
          where: {
            conversationId: parseInt(conversationId),
            senderId: { not: socket.userId },
            readAt: null
          },
          data: { readAt: new Date() }
        });

        // Update unread counts
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: parseInt(conversationId),
            senderId: { not: socket.userId },
            readAt: null
          }
        });

        // Notify conversation participants
        this.io.to(`conversation_${conversationId}`).emit('messages_read', {
          conversationId,
          readBy: socket.userId,
          unreadCount
        });

      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Typing indicators
    socket.on('typing_start', (conversationId) => {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId
      });
    });

    socket.on('typing_stop', (conversationId) => {
      socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
        userId: socket.userId,
        conversationId
      });
    });
  }

  handlePresenceEvents(socket) {
    // Update user presence
    socket.on('update_presence', (status) => {
      // Could store in Redis/cache for presence across multiple server instances
      this.io.to(`user_${socket.userId}`).emit('presence_updated', {
        userId: socket.userId,
        status, // 'online', 'away', 'busy'
        lastSeen: new Date()
      });
    });
  }

  trackUserConnection(userId, socketId) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socketId);
    this.socketUsers.set(socketId, userId);

    // Emit online status to user's contacts
    this.broadcastPresence(userId, 'online');
  }

  trackUserDisconnection(userId, socketId) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
        // User is completely offline
        this.broadcastPresence(userId, 'offline');
      }
    }
    this.socketUsers.delete(socketId);
  }

  broadcastPresence(userId, status) {
    // Get user's conversations and notify participants
    // This is a simplified version - in production you'd cache this
    this.getUserConversations(userId).then(conversations => {
      conversations.forEach(conv => {
        const otherUserId = conv.studentId === userId ? conv.collaboratorId : conv.studentId;
        this.notifyUser(otherUserId, 'presence_change', {
          userId,
          status,
          lastSeen: new Date()
        });
      });
    });
  }

  async getUserConversations(userId) {
    return await prisma.conversation.findMany({
      where: {
        OR: [
          { studentId: userId },
          { collaboratorId: userId }
        ]
      },
      select: {
        id: true,
        studentId: true,
        collaboratorId: true
      }
    });
  }

  notifyUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // Method to emit events from other parts of the application
  emitToUser(userId, event, data) {
    this.notifyUser(userId, event, data);
  }

  emitToConversation(conversationId, event, data) {
    this.io.to(`conversation_${conversationId}`).emit(event, data);
  }

  // Get online users (for admin purposes)
  getOnlineUsers() {
    return Array.from(this.userSockets.keys());
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.userSockets.has(userId);
  }
}

module.exports = new SocketService();