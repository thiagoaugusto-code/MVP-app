import React, { useState, useEffect } from 'react';
import { chatAPI } from '../services/api';
import styles from './Chat.module.css';

const Chat = ({ conversationId, collaboratorProfile }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiMode, setAiMode] = useState('direct');

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000); // Poll a cada 3s (websocket seria ideal)
    return () => clearInterval(interval);
  }, [conversationId]);

  const loadMessages = async () => {
    try {
      const response = await chatAPI.getMessages(conversationId);
      setMessages(response.data);
      await chatAPI.markAsRead(conversationId);
    } catch (err) {
      setError('Erro ao carregar mensagens');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      await chatAPI.sendMessage(conversationId, {
        content: newMessage,
        type: 'text'
      });
      setNewMessage('');
      await loadMessages();
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