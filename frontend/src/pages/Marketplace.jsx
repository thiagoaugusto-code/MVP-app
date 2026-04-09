import React, { useState, useEffect } from 'react';
import { collaboratorsAPI } from '../services/api';
import styles from './Marketplace.module.css';

const Marketplace = () => {
  const [collaborators, setCollaborators] = useState([]);
  const [specialty, setSpecialty] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState([]);

  const specialties = [
    { value: 'nutritionist', label: 'Nutricionista' },
    { value: 'personal', label: 'Personal Trainer' },
    { value: 'instructor', label: 'Instrutor' },
    { value: 'coach', label: 'Coach' },
  ];

  useEffect(() => {
    loadCollaborators();
    loadRequests();
  }, [specialty]);

  const loadCollaborators = async () => {
    setLoading(true);
    try {
      const response = await collaboratorsAPI.getCollaborators(specialty);
      setCollaborators(response.data);
    } catch (err) {
      setError('Erro ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const response = await collaboratorsAPI.getRequests();
      setRequests(response.data);
    } catch (err) {
      console.error('Erro ao carregar solicitações');
    }
  };

  const handleRequest = async (collaboratorId, specialty) => {
    try {
      await collaboratorsAPI.requestCollaboration({ collaboratorId, specialty });
      loadRequests();
      alert('Solicitação enviada!');
    } catch (err) {
      alert('Erro ao enviar solicitação');
    }
  };

  const getRequestStatus = (collaboratorId, specialty) => {
    const req = requests.find(r => r.collaboratorId === collaboratorId && r.specialty === specialty);
    return req ? req.status : null;
  };

  return (
    <div className={styles.marketplace}>
      <h1>Marketplace de Colaboradores</h1>
      
      <div className={styles.filters}>
        <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
          <option value="">Todas as especialidades</option>
          {specialties.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading && <p>Carregando...</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.collaboratorsGrid}>
        {collaborators.map(collab => (
          <div key={collab.id} className={styles.collaboratorCard}>
            <img src={collab.user.avatar || '/default-avatar.png'} alt={collab.user.name} />
            <h3>{collab.user.name}</h3>
            <p><strong>Especialidade:</strong> {collab.specialty}</p>
            <p><strong>Bio:</strong> {collab.bio || 'Sem descrição'}</p>
            <p><strong>Foco:</strong> {collab.focus || 'Geral'}</p>
            <p><strong>Experiência:</strong> {collab.experience ? `${collab.experience} anos` : 'N/A'}</p>
            <p><strong>Preço:</strong> {collab.price ? `R$ ${collab.price}` : 'Consulte'}</p>
            
            {(() => {
              const status = getRequestStatus(collab.userId, collab.specialty);
              if (status === 'pending') {
                return <button disabled>Pendente</button>;
              } else if (status === 'approved') {
                return <button disabled>Aprovado</button>;
              } else if (status === 'rejected') {
                return <button disabled>Rejeitado</button>;
              } else {
                return (
                  <button onClick={() => handleRequest(collab.userId, collab.specialty)}>
                    Solicitar Acompanhamento
                  </button>
                );
              }
            })()}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marketplace;