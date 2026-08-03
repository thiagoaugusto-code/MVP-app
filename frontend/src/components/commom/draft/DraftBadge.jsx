import React from 'react';
import { DRAFT_STATUS } from './types';

const defaultLabels = {
  [DRAFT_STATUS.SAVED]: 'Rascunho salvo',
  [DRAFT_STATUS.PENDING]: 'Alterações pendentes...',
  [DRAFT_STATUS.SYNCED]: 'Sincronizado',
  [DRAFT_STATUS.IDLE]: '',
};

export const DraftBadge = ({ status, customLabels = {}, className = '' }) => {
  if (!status || status === DRAFT_STATUS.IDLE) return null;

  const labels = { ...defaultLabels, ...customLabels };

  return (
    <span
      className={`draft-badge draft-badge--${status.toLowerCase()} ${className}`}
      data-status={status}
    >
      {labels[status] || ''}
    </span>
  );
};