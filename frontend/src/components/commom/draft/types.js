import { getTodayDateKey } from '../../../utils/date';

/**
 * Re-exportação para garantir que o Draft System utilize a fonte única de verdade temporal.
 */
export const getDateKey = () => getTodayDateKey();

/**
 * Versão atual da estrutura do rascunho para migrações
 */
export const DRAFT_VERSION = 1;

/**
 * Prefixos de armazenamento
 */
export const DRAFT_STORAGE_PREFIX = 'SAGE_DRAFT';

/**
 * Status possíveis do rascunho
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