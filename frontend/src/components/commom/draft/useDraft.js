import { useContext, useCallback, useState, useEffect, useMemo } from 'react';
import { DraftContext } from './DraftContext';
import { mergeDraft } from './mergeDraft';
import { DRAFT_STATUS, getDateKey } from './types';

/**
 * Hook reativo para gestão de rascunhos em tempo de execução.
 *
 * @param {string|number} userId - Identificador do usuário logado
 * @param {string} module - Nome do módulo (ex: 'nutrition', 'workout')
 * @param {Object} [options]
 * @param {string} [options.dateKey] - Data do ciclo (padrão: data atual via Sistema Temporal)
 * @param {string} [options.entityId] - Sub-contexto (ex: 'breakfast', 'workout_a')
 * @param {string|number|null} [options.id] - ID do registro persistido
 * @param {Object|null} [options.persistedData] - Dados originais vindos do backend
 */
export function useDraft(userId, module, options = {}) {
  const {
    dateKey = getDateKey(),
    entityId = 'default',
    id = null,
    persistedData = null,
  } = options;

  const repository = useContext(DraftContext);

  if (!repository) {
    throw new Error('useDraft deve ser utilizado dentro de um <DraftProvider>');
  }

  const [status, setStatus] = useState(DRAFT_STATUS.IDLE);
  const [draft, setDraft] = useState(() =>
    repository.loadDraft(userId, module, dateKey, entityId, id)
  );

  // Efeito reativo para mudanças no contexto temporal ou entidade
  useEffect(() => {
    const loaded = repository.loadDraft(userId, module, dateKey, entityId, id);
    setDraft(loaded);
    setStatus(loaded ? DRAFT_STATUS.SAVED : DRAFT_STATUS.IDLE);
  }, [repository, userId, module, dateKey, entityId, id]);

  const saveDraft = useCallback(
    (payload) => {
      setStatus(DRAFT_STATUS.PENDING);
      const saved = repository.saveDraft(userId, module, dateKey, payload, entityId, id);
      setDraft(saved);
      setStatus(DRAFT_STATUS.SAVED);
      return saved;
    },
    [repository, userId, module, dateKey, entityId, id]
  );

  const updateDraft = useCallback(
    (partialPayload) => {
      setStatus(DRAFT_STATUS.PENDING);
      const updated = repository.updateDraft(userId, module, dateKey, partialPayload, entityId, id);
      setDraft(updated);
      setStatus(DRAFT_STATUS.SAVED);
      return updated;
    },
    [repository, userId, module, dateKey, entityId, id]
  );

  const deleteDraft = useCallback(() => {
    const success = repository.deleteDraft(userId, module, entityId, id);
    if (success) {
      setDraft(null);
      setStatus(DRAFT_STATUS.IDLE);
    }
    return success;
  }, [repository, userId, module, entityId, id]);

  const mergedData = useMemo(() => {
    return mergeDraft(draft, persistedData);
  }, [draft, persistedData]);

  return {
    draft,
    mergedData,
    status,
    saveDraft,
    updateDraft,
    deleteDraft,
    hasDraft: Boolean(draft),
  };
}