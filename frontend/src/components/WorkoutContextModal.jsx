import { useState, useEffect } from 'react';
import styles from './WorkoutContextModal.module.css';

export default function WorkoutContextModal({
  workout,
  initialContext = [],
  onClose,
  onSave,
}) {

  const [contexts, setContexts] = useState(initialContext);

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
          placeholder="Tipo (ex: Grupo muscular)"
          value={newContext.label}
          onChange={(e)=>
            setNewContext({
              ...newContext,
              label:e.target.value
            })
          }
        />


        <input
          placeholder="Valor (ex: Peito)"
          value={newContext.value}
          onChange={(e)=>
            setNewContext({
              ...newContext,
              value:e.target.value
            })
          }
        />


        <button
          type="button"
          onClick={addContext}
        >
          + Adicionar informação
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
          Salvar contexto
        </button>


      </div>
    </div>
  );
}