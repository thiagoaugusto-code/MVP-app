import { DRAFT_STORAGE_PREFIX, DRAFT_VERSION, getDateKey } from './types';
import { LocalStorageAdapter } from './storage/LocalStorageAdapter';

export class DraftRepository {
  /**
   * @param {Object} [storageAdapter] - Instância do adapter de armazenamento
   */
  constructor(storageAdapter = null) {
    this.adapter = storageAdapter || new LocalStorageAdapter();
  }

  /**
   * Composição robusta da chave:
   * SAGE_DRAFT_<userId>_<module>_<entityId>_<id>
   *
   * @param {string|number} userId
   * @param {string} module - Ex: 'nutrition', 'workout'
   * @param {string} [entityId] - Identificador de sub-contexto (ex: 'breakfast', 'workout_a')
   * @param {string|number|null} [id] - ID do recurso persitido ou 'new'
   */
  _buildKey(userId, module, entityId = 'default', id = 'new') {
    const userKey = userId ?? 'guest';
    const entityKey = entityId || 'default';
    const resourceId = id ?? 'new';
    return `${DRAFT_STORAGE_PREFIX}_${userKey}_${module}_${entityKey}_${resourceId}`;
  }

  /**
   * Salva um rascunho atrelado explicitamente a um dateKey
   */
  saveDraft(userId, module, dateKey, payload, entityId = 'default', id = null) {
    const targetDateKey = dateKey || getDateKey();
    const key = this._buildKey(userId, module, entityId, id);
    const existing = this._rawLoad(key);

    const now = new Date().toISOString();
    const draftData = {
      version: DRAFT_VERSION,
      module,
      entityId,
      id: id ?? null,
      draftDate: targetDateKey,
      payload,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    try {
      this.adapter.setItem(key, JSON.stringify(draftData));
      return draftData;
    } catch (error) {
      console.error(`[DraftRepository] Erro ao salvar draft na chave ${key}:`, error);
      return null;
    }
  }

  /**
   * Carrega um rascunho e valida contra o dateKey solicitado.
   * Purga e remove automaticamente se pertencer a outro dia.
   */
  loadDraft(userId, module, dateKey, entityId = 'default', id = null) {
    const targetDateKey = dateKey || getDateKey();
    const key = this._buildKey(userId, module, entityId, id);
    const draft = this._rawLoad(key);

    if (!draft) return null;

    // Purga automática por inconsistência de ciclo diário
    if (draft.draftDate !== targetDateKey) {
      this.deleteDraft(userId, module, entityId, id);
      return null;
    }

    return draft;
  }

  /**
   * Atualiza parcialmente um rascunho existente
   */
  updateDraft(userId, module, dateKey, partialPayload, entityId = 'default', id = null) {
    const current = this.loadDraft(userId, module, dateKey, entityId, id);
    const updatedPayload = {
      ...(current?.payload || {}),
      ...partialPayload,
    };
    return this.saveDraft(userId, module, dateKey, updatedPayload, entityId, id);
  }

  /**
   * Remove um rascunho específico
   */
  deleteDraft(userId, module, entityId = 'default', id = null) {
    const key = this._buildKey(userId, module, entityId, id);
    try {
      this.adapter.removeItem(key);
      return true;
    } catch (error) {
      console.error(`[DraftRepository] Erro ao remover draft na chave ${key}:`, error);
      return false;
    }
  }

  /**
   * Varredura centralizada de limpeza de rascunhos expirados para o usuário.
   * Remove rascunhos cujo draftDate não corresponda ao dateKey atual.
   *
   * @param {string|number} userId
   * @param {string} [currentDateKey] - Opcional. Se omitido, usa a data atual do sistema temporal.
   */
  cleanupExpiredDrafts(userId, currentDateKey = null) {
    const activeDateKey = currentDateKey || getDateKey();
    const userPrefix = `${DRAFT_STORAGE_PREFIX}_${userId ?? 'guest'}_`;

    try {
      const keys = this.adapter.keys();
      keys.forEach((key) => {
        if (key.startsWith(userPrefix)) {
          const draft = this._rawLoad(key);
          if (draft && draft.draftDate !== activeDateKey) {
            this.adapter.removeItem(key);
          }
        }
      });
      return true;
    } catch (error) {
      console.error(`[DraftRepository] Erro durante a limpeza de rascunhos expirados:`, error);
      return false;
    }
  }

  /**
   * Limpa rascunhos de um usuário filtrando opcionalmente por módulo
   */
  clearDraft(userId, module = null) {
    try {
      const keys = this.adapter.keys();
      const userKey = userId ?? 'guest';
      const prefix = module
        ? `${DRAFT_STORAGE_PREFIX}_${userKey}_${module}_`
        : `${DRAFT_STORAGE_PREFIX}_${userKey}_`;

      keys.forEach((key) => {
        if (key.startsWith(prefix)) {
          this.adapter.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error(`[DraftRepository] Erro ao limpar drafts:`, error);
      return false;
    }
  }

  /**
   * Leitura direta auxiliar no storage sem validações de expiração
   */
  _rawLoad(key) {
    try {
      const raw = this.adapter.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }
}

export const defaultDraftRepository = new DraftRepository();