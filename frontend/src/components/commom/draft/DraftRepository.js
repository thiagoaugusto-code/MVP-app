import { DRAFT_STORAGE_PREFIX, DRAFT_VERSION } from './types';
import { LocalStorageAdapter } from './storage/LocalStorageAdapter';

export class DraftRepository {
  /**
   * @param {Object} [storageAdapter] - Instância de adapter (interface: getItem, setItem, removeItem, keys)
   */
  constructor(storageAdapter = null) {
    this.adapter = storageAdapter || new LocalStorageAdapter();
  }

  /**
   * Formato da chave: SAGE_DRAFT_<userId>_<module>_<id>
   */
  _buildKey(userId, module, id) {
    const userKey = userId ?? 'guest';
    const idKey = id ?? 'new';
    return `${DRAFT_STORAGE_PREFIX}_${userKey}_${module}_${idKey}`;
  }

  /**
   * Salva ou substitui um rascunho
   */
  saveDraft(userId, module, id, payload) {
    const key = this._buildKey(userId, module, id);
    const draftData = {
      version: DRAFT_VERSION,
      module,
      id: id ?? null,
      payload,
      updatedAt: new Date().toISOString(),
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
   * Carrega um rascunho
   */
  loadDraft(userId, module, id) {
    const key = this._buildKey(userId, module, id);
    try {
      const raw = this.adapter.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error(`[DraftRepository] Erro ao carregar draft da chave ${key}:`, error);
      return null;
    }
  }

  /**
   * Atualiza parcialmente o payload de um rascunho
   */
  updateDraft(userId, module, id, partialPayload) {
    const current = this.loadDraft(userId, module, id);
    const updatedPayload = {
      ...(current?.payload || {}),
      ...partialPayload,
    };
    return this.saveDraft(userId, module, id, updatedPayload);
  }

  /**
   * Remove um rascunho específico
   */
  deleteDraft(userId, module, id) {
    const key = this._buildKey(userId, module, id);
    try {
      this.adapter.removeItem(key);
      return true;
    } catch (error) {
      console.error(`[DraftRepository] Erro ao remover draft da chave ${key}:`, error);
      return false;
    }
  }

  /**
   * Limpa rascunhos filtrando por usuário e opcionalmente por módulo
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
}

export const defaultDraftRepository = new DraftRepository();