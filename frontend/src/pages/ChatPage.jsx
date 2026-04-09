import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import Chat from '../components/Chat';
import { chatAPI, collaboratorsAPI } from '../services/api';
import styles from './ChatPage.module.css';

const ChatPage = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [collaboratorDetails, setCollaboratorDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const response = await chatAPI.getConversations();
      setConversations(response.data);
      
      if (response.data.length > 0) {
        setSelectedConversation(response.data[0]);
        // Buscar detalhes do colaborador
        const collab = await collaboratorsAPI.getCollaborators();
        const details = collab.data.find(c => 
          c.userId === response.data[0].collaboratorId || 
          c.userId === response.data[0].studentId
        );
        setCollaboratorDetails(details);
      }
    } catch (err) {
      setError('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    // Buscar se é estudante ou colaborador
    const otherPartyId = conversation.studentId === conversation.student.id
      ? conversation.collaboratorId
      : conversation.studentId;
    
    const collab = await collaboratorsAPI.getCollaborators();
    const details = collab.data.find(c => c.userId === otherPartyId);
    setCollaboratorDetails(details);
  };

  return (
    <div className={styles.chatPage}>
      <Header />
      
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.conversationsList}>
            <h2>Conversas</h2>
            {loading && <p>Carregando...</p>}
            {error && <p className={styles.error}>{error}</p>}
            
            <div className={styles.conversations}>
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`${styles.conversationItem} ${selectedConversation?.id === conv.id ? styles.active : ''}`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <img
                    src={conv.collaborator?.avatar || '/default-avatar.png'}
                    alt={conv.collaborator?.name}
                  />
                  <div className={styles.convInfo}>
                    <h3>{conv.collaborator?.name}</h3>
                    <p>{conv.lastMessage?.substring(0, 40)}...</p>
                  </div>
                  {conv.studentUnread > 0 && (
                    <span className={styles.badge}>{conv.studentUnread}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.chatArea}>
            {selectedConversation && collaboratorDetails ? (
              <Chat
                conversationId={selectedConversation.id}
                collaboratorProfile={collaboratorDetails}
              />
            ) : (
              <div className={styles.noChat}>
                <p>Selecione uma conversa para começar</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default ChatPage;