import { useContext, useCallback, useState, useEffect, useMemo } from 'react';
import { DraftContext } from './DraftContext';
import { mergeDraft } from './mergeDraft';
import { DRAFT_STATUS } from './types';

/**
 * Hook reativo para gestão de rascunhos em formulários/views.
 *
 * @param {string|number} userId - Identificador do usuário logado
 * @param {string} module - Módulo da aplicação (ex: 'workout', 'nutrition')
 * @param {string|number|null} id - ID do recurso ou null para novos registros
 * @param {Object|null} persistedData - Dados originais do registro
 */
export function useDraft(userId, module, id = null, persistedData = null) {
  const repository = useContext(DraftContext);

  if (!repository) {
    throw new Error('useDraft deve ser utilizado dentro de um <DraftProvider>');
  }

  const [status, setStatus] = useState(DRAFT_STATUS.IDLE);
  const [draft, setDraft] = useState(() => repository.loadDraft(userId, module, id));

  // Recarrega o rascunho caso mude o userId, módulo ou id
  useEffect(() => {
    const loaded = repository.loadDraft(userId, module, id);
    setDraft(loaded);
    setStatus(loaded ? DRAFT_STATUS.SAVED : DRAFT_STATUS.IDLE);
  }, [repository, userId, module, id]);

  const save = useCallback((payload) => {
    setStatus(DRAFT_STATUS.PENDING);
    const saved = repository.saveDraft(userId, module, id, payload);
    setDraft(saved);
    setStatus(DRAFT_STATUS.SAVED);
    return saved;
  }, [repository, userId, module, id]);

  const update = useCallback((partialPayload) => {
    setStatus(DRAFT_STATUS.PENDING);
    const updated = repository.updateDraft(userId, module, id, partialPayload);
    setDraft(updated);
    setStatus(DRAFT_STATUS.SAVED);
    return updated;
  }, [repository, userId, module, id]);

  const remove = useCallback(() => {
    const success = repository.deleteDraft(userId, module, id);
    if (success) {
      setDraft(null);
      setStatus(DRAFT_STATUS.IDLE);
    }
    return success;
  }, [repository, userId, module, id]);

  const mergedData = useMemo(() => {
    return mergeDraft(draft, persistedData);
  }, [draft, persistedData]);

  return {
    draft,
    mergedData,
    status,
    saveDraft: save,
    updateDraft: update,
    deleteDraft: remove,
    hasDraft: Boolean(draft),
  };
}