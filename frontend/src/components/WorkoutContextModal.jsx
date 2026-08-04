import { useState } from 'react';
import styles from './WorkoutContextModal.module.css';
import { AutoSave, useDraft } from './commom/draft';

const getCurrentUserId = () => {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) return 'guest';

  try {
    const parsed = JSON.parse(storedUser);
    return parsed?.id || parsed?.userId || parsed?.email || 'guest';
  } catch {
    return 'guest';
  }
};

export default function WorkoutContextModal({
  workout,
  initialContext = [],
  onClose,
  onSave,
}) {
  const { mergedData, updateDraft, deleteDraft } = useDraft(
    getCurrentUserId(),
    'workout',
    {
      entityId: String(workout.id),
      id: 'new',
      persistedData: { records: initialContext || [] },
    }
  );

  const initialRecords = mergedData?.records ?? initialContext ?? [
    {
      id: Date.now(),
      exercise: '',
      value: '',
      notes: '',
    },
  ];

  const [records, setRecords] = useState(initialRecords);

  function addRecord() {
    setRecords((prev) => [
      ...prev,
      {
        id: Date.now(),
        exercise: '',
        value: '',
        notes: '',
      },
    ]);
  }

  function updateRecord(id, field, value) {
    setRecords((prev) =>
      prev.map((record) =>
        record.id === id
          ? {
              ...record,
              [field]: value,
            }
          : record
      )
    );
  }

  async function handleSave() {
    const data = {
      workoutId: workout.id,
      workoutName: workout.name,
      records,
    };

    console.log('REGISTROS DO TREINO:', data);

    await onSave(data);
    deleteDraft();
  }


  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>


        <div className={styles.header}>

          <h2>
            {workout.name}
          </h2>

          <button
            type="button"
            onClick={onClose}
          >
            ✕
          </button>

        </div>
        <p>
          Registre sua execução
        </p>

        {records.map((record, index) => (

          <div
            key={record.id}
            className={styles.contextItem}
          >

            <h3>
              Registro {index + 1}
            </h3>


            <input
              placeholder="Exercício (ex: Supino reto 4x10)"
              value={record.exercise}
              onChange={(e)=>
                updateRecord(
                  record.id,
                  'exercise',
                  e.target.value
                )
              }
            />


            <input
              placeholder="Carga, distância, tempo..."
              value={record.value}
              onChange={(e)=>
                updateRecord(
                  record.id,
                  'value',
                  e.target.value
                )
              }
            />


            <textarea
              placeholder="Como foi?"
              value={record.notes}
              onChange={(e)=>
                updateRecord(
                  record.id,
                  'notes',
                  e.target.value
                )
              }
            />

          </div>

        ))}


        <button
          type="button"
          onClick={addRecord}
        >
          + Adicionar registro
        </button>

        <button
          type="button"
          onClick={handleSave}
        >
          Salvar treino
        </button>

        <AutoSave
          data={{ records }}
          onSave={(draftPayload) => {
            updateDraft({ records: draftPayload.records || [] });
          }}
          delay={900}
          enabled={Boolean(records)}
        />
      </div>
    </div>
  );
}