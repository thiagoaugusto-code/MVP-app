import styles from '../pages/DietPlan.module.css';

const MealRegisterModal = ({
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
}) => {
  if (!open) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h3>Registrar refeição</h3>

        <form onSubmit={onSubmit}>
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
        </form>
      </div>
    </div>
  );
};

export default MealRegisterModal;