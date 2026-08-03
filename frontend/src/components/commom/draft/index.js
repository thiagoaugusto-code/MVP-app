export { LocalStorageAdapter } from './storage/LocalStorageAdapter';
export { DraftRepository, defaultDraftRepository } from './DraftRepository';
export { mergeDraft, hasDraftConflicts } from './mergeDraft';
export { DraftContext, DraftProvider } from './DraftContext';
export { useDraft } from './useDraft';
export { AutoSave } from './AutoSave';
export { DraftBadge } from './DraftBadge';
export {
  DRAFT_VERSION,
  DRAFT_STORAGE_PREFIX,
  DRAFT_STATUS,
  DRAFT_EVENTS,
} from './types';