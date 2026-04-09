import React, { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../services/api';
import socketService from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import ConnectionStatus from './ConnectionStatus';
import AILoadingMessage from './AILoadingMessage';
import styles from './Chat.module.css';

const Chat = ({ conversationId, collaboratorProfile }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiMode, setAiMode] = useState('coach');
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [connectionError, setConnectionError] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { user } = useAuth();

  // Socket connection status
  const connectionStatus = socketService.getConnectionStatus();


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
    if (!newMessage.trim() && aiMode) {
      // If no manual message, generate AI response for current context
      setAiLoading(true);
      try {
        const response = await chatAPI.sendAIChat(conversationId, { 
          mode: aiMode,
          prompt: 'Analyze my current status and provide insight'
        });
        
        // Add AI response to messages
        if (response.data) {
          const aiMessage = {
            id: Date.now(),
            conversationId,
            senderId: 0, // System/AI
            content: response.data.text,
            type: 'text',
            isAI: true,
            createdAt: new Date(),
            readAt: null
          };
          setMessages(prev => [...prev, aiMessage]);
          scrollToBottom();
        }
      } catch (err) {
        setError('Erro ao gerar resposta IA: ' + (err.response?.data?.message || err.message));
      } finally {
        setAiLoading(false);
      }
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
              {isOnline ? '● Online' : '○ Offline'}
            </span>
          </div>
        </div>
        <ConnectionStatus 
          isConnected={connectionStatus.isConnected}
          socketId={connectionStatus.socketId}
          error={connectionError}
        />
      </div>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button onClick={() => setError('')} className={styles.closeError}>✕</button>
        </div>
      )}

      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.emptyState}>
            <p>Sem mensagens ainda</p>
            <small>Inicie uma conversa ou solicite um insight IA</small>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`${styles.message} ${
              message.senderId === user.id ? styles.own : styles.other
            } ${message.isAI ? styles.aiMessage : ''}`}
          >
            {message.isAI && <span className={styles.aiBadge}>🤖 IA</span>}
            <div className={styles.messageContent}>
              {message.content}
            </div>
            <div className={styles.messageTime}>
              {new Date(message.createdAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
              {message.readAt && message.senderId === user.id && (
                <span className={styles.readIndicator}>✓✓</span>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className={styles.typingIndicator}>
            <div className={styles.typingDots}>
              <span></span><span></span><span></span>
            </div>
            <span>{collaboratorProfile?.name} está digitando...</span>
          </div>
        )}

        {aiLoading && <AILoadingMessage mode={aiMode} />}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.controls}>
        <div className={styles.aiModeGroup}>
          <select
            value={aiMode}
            onChange={(e) => setAiMode(e.target.value)}
            className={styles.aiModeSelect}
            disabled={aiLoading}
          >
            <option value="coach">💪 Coach</option>
            <option value="preventive">🛡️ Preventivo</option>
            <option value="celebration">🎉 Celebração</option>
            <option value="welcoming">🤝 Acolhedor</option>
          </select>

          <button
            onClick={handleAIChat}
            disabled={aiLoading || loading}
            className={styles.aiButton}
            title="Solicitar insight IA"
          >
            {aiLoading ? '⏳' : '💬'} IA
          </button>
        </div>
      </div>

      <form onSubmit={handleSendMessage} className={styles.messageForm}>
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="Digite sua mensagem..."
          disabled={loading || !connectionStatus.isConnected}
          className={styles.messageInput}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !newMessage.trim() || !connectionStatus.isConnected}
          className={styles.sendButton}
          title={!connectionStatus.isConnected ? 'Conectando...' : 'Enviar'}
        >
          {loading ? '⏳' : '📤'}
        </button>
      </form>
    </div>
  );
};

export default Chat;