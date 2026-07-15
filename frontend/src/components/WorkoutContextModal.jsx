import { useState, useEffect } from 'react';
import styles from './WorkoutContextModal.module.css';

export default function WorkoutContextModal({
  workout,
  initialContext = [],
  onClose,
  onSave,
}) {

  const [contexts, setContexts] = useState(initialContext);

  const [notes, setNotes] = useState('');

  const [newContext, setNewContext] = useState({
    label: '',
    value: '',
  });


  useEffect(() => {
    setContexts(initialContext);
  }, [initialContext]);


  function addContext() {
    if (!newContext.label.trim() || !newContext.value.trim()) {
      return;
    }


    const newItem = {
      label: newContext.label.trim(),
      value: newContext.value.trim(),
    };


    setContexts(prev => [
      ...prev,
      newItem
    ]);


    setNewContext({
      label: '',
      value: '',
    });
  }


  function handleSave() {

    const data = {
      workoutId: workout.id,
      workoutName: workout.name,
      context: contexts,
      notes
    };


    console.log(
      'CONTEXTO DO TREINO:',
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
          Adicione informações sobre essa atividade
        </p>


        <input
          placeholder="Ex: Peito(Supino), Boxe, Corrida, etc."
          value={newContext.label}
          onChange={(e)=>
            setNewContext({
              ...newContext,
              label:e.target.value
            })
          }
        />


        <input
          placeholder="Ex: 80 kg, 21 km, Sparring, No-Gi..."  
          value={newContext.value}
          onChange={(e)=>
            setNewContext({
              ...newContext,
              value:e.target.value
            })
          }
        />

        
        <textarea
          placeholder="Como foi?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />


        <button
          type="button"
          onClick={addContext}
        >
          Registrar contexto
        </button>


        <div className={styles.contextList}>

          {contexts.map((item,index)=>(
            <div
              key={index}
              className={styles.contextItem}
            >
              <strong>
                {item.label}
              </strong>
              :
              {item.value}
            </div>
          ))}

        </div>


        <button
          type="button"
          onClick={handleSave}
        >
          Salvar contexto registrado
        </button>
        <p>Certifique-se de registrar antes de salvar para que apareça no card</p>


      </div>
    </div>
  );
}