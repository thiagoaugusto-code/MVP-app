/**
 * Versão atual da estrutura do rascunho para migrações futuras
 */
export const DRAFT_VERSION = 1;

/**
 * Prefixos e chaves de armazenamento
 */
export const DRAFT_STORAGE_PREFIX = 'SAGE_DRAFT';

/**
 * Status possíveis do rascunho para componentes de UI
 */
export const DRAFT_STATUS = {
  SAVED: 'SAVED',
  PENDING: 'PENDING',
  SYNCED: 'SYNCED',
  IDLE: 'IDLE',
};

/**
 * Eventos do sistema de rascunho
 */
export const DRAFT_EVENTS = {
  SAVED: 'draft:saved',
  DELETED: 'draft:deleted',
  CLEARED: 'draft:cleared',
};