import React from 'react';
import styles from './AILoadingMessage.module.css';

/**
 * AILoadingMessage Component
 * Shows animated loading state while waiting for AI response
 * 
 * Displays:
 * - Animated thinking indicator
 * - "IA está pensando..." text
 * - Gradient animation
 */

const AILoadingMessage = ({ mode = 'coach' }) => {
  const modeLabels = {
    coach: 'Coach está analisando...',
    preventive: 'Analisando padrões...',
    celebration: 'Procurando motivos para celebrar...',
    welcoming: 'Preparando acolhimento...'
  };

  return (
    <div className={styles.aiMessage}>
      <div className={styles.loader}>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
      </div>
      <span className={styles.text}>{modeLabels[mode] || 'IA está pensando...'}</span>
    </div>
  );
};

export default AILoadingMessage;
