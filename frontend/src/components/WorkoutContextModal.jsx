import { useState } from 'react';
import styles from './WorkoutContextModal.module.css';

export default function WorkoutContextModal({
  workout,
  onClose,
  onSave,
}) {

  const [contexts, setContexts] = useState([]);

  const [newContext, setNewContext] = useState({
    label: '',
    value: '',
  });


  function addContext() {
    if (!newContext.label || !newContext.value) return;


    setContexts(prev => [
      ...prev,
      {
        label: newContext.label,
        value: newContext.value,
      }
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

          <button onClick={onClose}>
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
          onClick={addContext}
        >
          + Adicionar informação
        </button>


        <div>

          {contexts.map((item,index)=>(
            <div key={index}>
              <strong>
                {item.label}
              </strong>
              :
              {item.value}
            </div>
          ))}

        </div>


        <button
          onClick={handleSave}
        >
          Salvar contexto
        </button>


      </div>
    </div>
  );
}