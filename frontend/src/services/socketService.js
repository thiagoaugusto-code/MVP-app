import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventListeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) {
      return;
    }

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    this.socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to Socket.io server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.io server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
    });

    // Setup default event handlers
    this.setupDefaultHandlers();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  setupDefaultHandlers() {
    // Chat events
    this.socket.on('new_message', (message) => {
      this.emit('new_message', message);
    });

    this.socket.on('messages_read', (data) => {
      this.emit('messages_read', data);
    });

    this.socket.on('user_typing', (data) => {
      this.emit('user_typing', data);
    });

    this.socket.on('user_stopped_typing', (data) => {
      this.emit('user_stopped_typing', data);
    });

    // Presence events
    this.socket.on('presence_change', (data) => {
      this.emit('presence_change', data);
    });

    this.socket.on('presence_updated', (data) => {
      this.emit('presence_updated', data);
    });

    // Notification events
    this.socket.on('unread_message', (data) => {
      this.emit('unread_message', data);
    });

    this.socket.on('message_error', (error) => {
      this.emit('message_error', error);
    });
  }

  // Chat methods
  joinConversation(conversationId) {
    if (this.socket) {
      this.socket.emit('join_conversation', conversationId);
    }
  }

  leaveConversation(conversationId) {
    if (this.socket) {
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  sendMessage(conversationId, content, type = 'text', metadata = {}) {
    if (this.socket) {
      this.socket.emit('send_message', {
        conversationId,
        content,
        type,
        metadata
      });
    }
  }

  markMessagesAsRead(conversationId) {
    if (this.socket) {
      this.socket.emit('mark_read', conversationId);
    }
  }

  startTyping(conversationId) {
    if (this.socket) {
      this.socket.emit('typing_start', conversationId);
    }
  }

  stopTyping(conversationId) {
    if (this.socket) {
      this.socket.emit('typing_stop', conversationId);
    }
  }

  // Presence methods
  updatePresence(status) {
    if (this.socket) {
      this.socket.emit('update_presence', status);
    }
  }

  // Event system
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Utility methods
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id
    };
  }

  // Cleanup
  removeAllListeners() {
    this.eventListeners.clear();
  }
}

// Export singleton instance
export default new SocketService();