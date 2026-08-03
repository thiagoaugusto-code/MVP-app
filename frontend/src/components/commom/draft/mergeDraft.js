/**
 * Mescla um rascunho com o registro persistido.
 * O payload do rascunho tem prioridade sobre o registro persistido.
 *
 * @param {Object|null} draft - Objeto do draft contendo version, payload, updatedAt
 * @param {Object|null} persistedRecord - Registro vindo da API/banco
 * @param {Object} [options] - Permite passar um customResolver para cenários específicos
 * @returns {Object} Objeto final mesclado
 */
export function mergeDraft(draft, persistedRecord, options = {}) {
  const base = persistedRecord || {};
  const draftPayload = draft?.payload || draft || {};

  if (options.customResolver && typeof options.customResolver === 'function') {
    return options.customResolver(draftPayload, base);
  }

  return {
    ...base,
    ...draftPayload,
    _hasDraftChanges: Object.keys(draftPayload).length > 0,
    _draftUpdatedAt: draft?.updatedAt || null,
  };
}

/**
 * Utilidades complementares para checagem de conflitos
 */
export function hasDraftConflicts(draft, persistedRecord) {
  if (!draft || !persistedRecord) return false;
  const draftTime = new Date(draft.updatedAt).getTime();
  const persistedTime = new Date(persistedRecord.updatedAt || persistedRecord.updated_at).getTime();

  return Boolean(draftTime && persistedTime && persistedTime > draftTime);
}