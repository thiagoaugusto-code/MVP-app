import { useState, useEffect } from "react";
import styles from "./AddMealModal.module.css";

const AddMealModal = ({
  open,
  onClose,
  onSubmit,
  submitting = false,
}) => {
  const [mealName, setMealName] = useState("");
  const [mealTime, setMealTime] = useState("");

  useEffect(() => {
    if (open) {
      setMealName("");
      setMealTime("");
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!mealName.trim() || !mealTime) return;

    onSubmit({
      name: mealName.trim(),
      time: mealTime,
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>Adicionar refeição</h2>

        <form onSubmit={handleSubmit}>

          <div className={styles.field}>
            <label>Nome da refeição</label>

            <input
              type="text"
              placeholder="Ex.: Café da manhã"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label>Horário</label>

            <input
              type="time"
              value={mealTime}
              onChange={(e) => setMealTime(e.target.value)}
            />
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Salvando..." : "Adicionar"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddMealModal;