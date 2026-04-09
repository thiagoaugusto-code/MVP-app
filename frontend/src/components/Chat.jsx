import React, { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../services/api';
import socketService from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import styles from './Chat.module.css';

const Chat = ({ conversationId, collaboratorProfile }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiMode, setAiMode] = useState('direct');
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    // Connect to socket if not connected
    if (!socketService.getConnectionStatus().isConnected && user?.token) {
      socketService.connect(user.token);
    }

    // Join conversation room
    socketService.joinConversation(conversationId);

    // Load initial messages
    loadMessages();

    // Setup socket event listeners
    const handleNewMessage = (message) => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      scrollToBottom();
    };

    const handleMessagesRead = (data) => {
      if (data.readBy !== user.id) {
        setMessages(prev => prev.map(msg =>
          msg.senderId !== user.id && msg.readAt === null
            ? { ...msg, readAt: new Date() }
            : msg
        ));
      }
    };

    const handleUserTyping = (data) => {
      if (data.userId !== user.id) {
        setIsTyping(true);
      }
    };

    const handleUserStoppedTyping = (data) => {
      if (data.userId !== user.id) {
        setIsTyping(false);
      }
    };

    const handlePresenceChange = (data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.status === 'online') {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    };

    const handleMessageError = (error) => {
      setError(error.error || 'Erro na comunicação');
    };

    // Register event listeners
    socketService.on('new_message', handleNewMessage);
    socketService.on('messages_read', handleMessagesRead);
    socketService.on('user_typing', handleUserTyping);
    socketService.on('user_stopped_typing', handleUserStoppedTyping);
    socketService.on('presence_change', handlePresenceChange);
    socketService.on('message_error', handleMessageError);

    // Cleanup function
    return () => {
      socketService.leaveConversation(conversationId);
      socketService.off('new_message', handleNewMessage);
      socketService.off('messages_read', handleMessagesRead);
      socketService.off('user_typing', handleUserTyping);
      socketService.off('user_stopped_typing', handleUserStoppedTyping);
      socketService.off('presence_change', handlePresenceChange);
      socketService.off('message_error', handleMessageError);
    };
  }, [conversationId, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const response = await chatAPI.getMessages(conversationId);
      setMessages(response.data);
      await chatAPI.markAsRead(conversationId);
      scrollToBottom();
    } catch (err) {
      setError('Erro ao carregar mensagens');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Stop typing indicator
    handleStopTyping();

    setLoading(true);
    try {
      socketService.sendMessage(conversationId, newMessage.trim(), 'text');
      setNewMessage('');
    } catch (err) {
      setError('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleAIChat = async () => {
    setLoading(true);
    try {
      await chatAPI.sendAIChat(conversationId, { mode: aiMode });
      // AI response will come through socket
    } catch (err) {
      setError('Erro ao enviar mensagem IA');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketService.startTyping(conversationId);
  };

  const handleStopTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(conversationId);
    }, 1000);
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    handleStartTyping();
  };

  const handleInputBlur = () => {
    handleStopTyping();
  };

  const isOnline = collaboratorProfile && onlineUsers.has(collaboratorProfile.userId);

  return (
    <div className={styles.chat}>
      <div className={styles.header}>
        <div className={styles.collaboratorInfo}>
          <img
            src={collaboratorProfile?.avatar || '/default-avatar.png'}
            alt={collaboratorProfile?.name || 'Colaborador'}
            className={styles.avatar}
          />
          <div>
            <h3>{collaboratorProfile?.name || 'Colaborador'}</h3>
            <span className={`${styles.status} ${isOnline ? styles.online : styles.offline}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.messages}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${styles.message} ${
              message.senderId === user.id ? styles.own : styles.other
            }`}
          >
            <div className={styles.messageContent}>
              {message.content}
              {message.isAI && <span className={styles.aiBadge}>IA</span>}
            </div>
            <div className={styles.messageTime}>
              {new Date(message.createdAt).toLocaleTimeString()}
              {message.readAt && message.senderId === user.id && (
                <span className={styles.readIndicator}>✓</span>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className={styles.typingIndicator}>
            {collaboratorProfile?.name} está digitando...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.controls}>
        <select
          value={aiMode}
          onChange={(e) => setAiMode(e.target.value)}
          className={styles.aiModeSelect}
        >
          <option value="coach">Coach Motivacional</option>
          <option value="preventive">Preventivo</option>
          <option value="celebration">Celebração</option>
          <option value="welcoming">Acolhedor</option>
        </select>

        <button
          onClick={handleAIChat}
          disabled={loading}
          className={styles.aiButton}
        >
          💬 IA
        </button>
      </div>

      <form onSubmit={handleSendMessage} className={styles.messageForm}>
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="Digite sua mensagem..."
          disabled={loading}
          className={styles.messageInput}
        />
        <button
          type="submit"
          disabled={loading || !newMessage.trim()}
          className={styles.sendButton}
        >
          {loading ? '...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
};

export default Chat;
      await loadMessages();
    } catch (err) {
      setError('Erro ao enviar para IA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <img
          src={collaboratorProfile?.user?.avatar || '/default-avatar.png'}
          alt={collaboratorProfile?.user?.name}
          className={styles.avatar}
        />
        <div>
          <h3>{collaboratorProfile?.user?.name}</h3>
          <p>{collaboratorProfile?.specialty}</p>
        </div>
      </div>

      <div className={styles.messagesContainer}>
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`${styles.message} ${msg.isAI ? styles.aiMessage : styles.userMessage}`}
          >
            <div className={styles.messageBubble}>
              <p>{msg.content}</p>
              <span className={styles.timestamp}>
                {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.aiControls}>
        <select value={aiMode} onChange={(e) => setAiMode(e.target.value)}>
          <option value="direct">Direto</option>
          <option value="welcoming">Acolhedor</option>
          <option value="hardcore">Coach Hardcore</option>
          <option value="preventive">Preventivo</option>
          <option value="celebration">Celebração</option>
        </select>
        <button onClick={handleAIChat} disabled={loading}>
          💡 IA
        </button>
      </div>

      <form onSubmit={handleSendMessage} className={styles.messageForm}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !newMessage.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
};

export default Chat;