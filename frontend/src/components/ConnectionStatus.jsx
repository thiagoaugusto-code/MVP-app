import React from 'react';
import styles from './ConnectionStatus.module.css';

/**
 * ConnectionStatus Component
 * Shows real-time Socket.io connection status
 * 
 * - Connected: Green indicator
 * - Connecting: Yellow spinner
 * - Disconnected: Red indicator
 * - Error: Red with message
 */

const ConnectionStatus = ({ isConnected, socketId, error }) => {
  if (!isConnected && !error) {
    return (
      <div className={styles.status} data-status="connecting">
        <div className={styles.spinner}></div>
        <span>Conectando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.status} data-status="error" title={error}>
        <span className={styles.indicator}></span>
        <span>Erro de conexão</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className={styles.status} data-status="connected" title={`Socket ID: ${socketId}`}>
        <span className={styles.indicator}></span>
        <span>Online</span>
      </div>
    );
  }

  return (
    <div className={styles.status} data-status="disconnected">
      <span className={styles.indicator}></span>
      <span>Offline</span>
    </div>
  );
};

export default ConnectionStatus;
