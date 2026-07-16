import { useState } from 'react';
import styles from './WorkoutContextModal.module.css';

export default function WorkoutContextModal({
  workout,
  onClose,
  onSave,
}) {

  const [records, setRecords] = useState([
    {
      id: Date.now(),
      exercise: '',
      value: '',
      notes: '',
    }
  ]);


  function addRecord() {

    setRecords(prev => [
      ...prev,
      {
        id: Date.now(),
        exercise: '',
        value: '',
        notes: '',
      }
    ]);

  }


  function updateRecord(id, field, value) {

    setRecords(prev =>
      prev.map(record =>
        record.id === id
          ? {
              ...record,
              [field]: value,
            }
          : record
      )
    );

  }


  function handleSave() {

    const data = {
      workoutId: workout.id,
      workoutName: workout.name,
      records,
    };


    console.log(
      'REGISTROS DO TREINO:',
      data
    );


    onSave(data);

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


      </div>
    </div>
  );
}