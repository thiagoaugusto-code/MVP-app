import { useEffect, useRef } from 'react';
import styles from '../pages/DietPlan.module.css';
import { AutoSave } from './commom/draft/AutoSave';
import { useDraft } from './commom/draft/useDraft';
import { getDateKey } from './commom/draft/types';

const getCurrentUserId = () => {
  if (typeof window === 'undefined') return 'guest';

  try {
    const storedUser = window.localStorage.getItem('user');
    if (!storedUser) return 'guest';

    const parsedUser = JSON.parse(storedUser);
    return parsedUser?.id || parsedUser?.userId || parsedUser?.email || 'guest';
  } catch {
    return 'guest';
  }
};

const MealRegisterModalContent = ({
  open,
  onClose,
  onSubmit,
  registerMode,
  setRegisterMode,
  manualNote,
  setManualNote,
  photoPreview,
  photoData,
  onPhotoSelect,
  submitting,
  mealId,
}) => {
  const hasHydratedRef = useRef(false);
  const shouldDeleteDraftRef = useRef(false);

  const { mergedData, saveDraft, deleteDraft } = useDraft(getCurrentUserId(), 'nutrition', {
    // Use the provided mealId as entityId so drafts are scoped per meal.
    // Fallback to a default string for safety when mealId is not provided.
    entityId: mealId ? String(mealId) : 'meal_register',
    dateKey: getDateKey(),
  });

  useEffect(() => {
    if (!open) {
      hasHydratedRef.current = false;
      return;
    }

    if (hasHydratedRef.current) return;

    if (mergedData?.registerMode === 'photo' || mergedData?.registerMode === 'manual') {
      setRegisterMode(mergedData.registerMode);
    }

    if (typeof mergedData?.manualNote === 'string' && mergedData.manualNote !== manualNote) {
      setManualNote(mergedData.manualNote);
    }

    hasHydratedRef.current = true;
  }, [manualNote, onPhotoSelect, open, photoPreview, setManualNote, setRegisterMode]);

  useEffect(() => {
    if (!open && shouldDeleteDraftRef.current) {
      deleteDraft();
      shouldDeleteDraftRef.current = false;
    }
  }, [deleteDraft, open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    shouldDeleteDraftRef.current = true;

    try {
      await onSubmit(event);
    } catch (error) {
      shouldDeleteDraftRef.current = false;
      throw error;
    }
  };

  if (!open) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h3>Registrar refeição</h3>

        <form onSubmit={handleSubmit}>
          <div className={styles.registerTabs}>
            <button
              type="button"
              className={
                registerMode === 'manual'
                  ? styles.tabActive
                  : styles.tab
              }
              onClick={() => setRegisterMode('manual')}
            >
              Manual
            </button>

            <button
              type="button"
              className={
                registerMode === 'photo'
                  ? styles.tabActive
                  : styles.tab
              }
              onClick={() => setRegisterMode('photo')}
            >
              Foto
            </button>
          </div>

          {registerMode === 'manual' ? (
            <textarea
              placeholder="Conte como foi sua refeição..."
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              required
              rows={4}
            />
          ) : (
            <div className={styles.photoUpload}>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onPhotoSelect}
              />

              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Prévia"
                  className={styles.photoPreview}
                />
              )}
            </div>
          )}

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                (registerMode === 'photo' && !photoData)
              }
            >
              {submitting ? 'Salvando...' : 'Registrar'}
            </button>
          </div>

          <AutoSave
            data={{ registerMode, manualNote, photoData, photoPreview }}
            onSave={(draftPayload) => {
              if (!open) return;

              saveDraft({
                registerMode: draftPayload.registerMode || 'manual',
                manualNote: draftPayload.manualNote || '',
                photoData: draftPayload.photoData || '',
                photoPreview: draftPayload.photoPreview || '',
              });
            }}
            delay={900}
            enabled={open}
          />
        </form>
      </div>
    </div>
  );
};

const MealRegisterModal = (props) => {
  if (!props.open) return null;

  return <MealRegisterModalContent {...props} />;
};

export default MealRegisterModal;