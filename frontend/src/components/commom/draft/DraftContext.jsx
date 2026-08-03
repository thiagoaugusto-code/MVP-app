import React, { createContext, useMemo } from 'react';
import { DraftRepository, defaultDraftRepository } from './DraftRepository';

export const DraftContext = createContext(null);

export const DraftProvider = ({ children, repository }) => {
  const draftRepository = useMemo(() => {
    return repository || defaultDraftRepository;
  }, [repository]);

  return (
    <DraftContext.Provider value={draftRepository}>
      {children}
    </DraftContext.Provider>
  );
};