import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import { dietAPI } from '../services/api';
import styles from './DietPlan.module.css';

const DietPlan = () => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('');
  const [foodForm, setFoodForm] = useState({
    name: '',
    quantity: '',
    unit: 'g',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    time: '',
    notes: ''
  });

  const mealTypes = [
    { value: 'breakfast', label: 'Café da Manhã' },
    { value: 'lunch', label: 'Almoço' },
    { value: 'dinner', label: 'Jantar' },
    { value: 'snack', label: 'Lanches' },
    { value: 'pre_workout', label: 'Pré Treino' },
    { value: 'post_workout', label: 'Pós Treino' }
  ];

  useEffect(() => {
    loadMeals();
  }, []);

  const loadMeals = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await dietAPI.getMeals(today);
      setMeals(response.data);
    } catch (err) {
      setError('Erro ao carregar refeições');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeal = async (mealType) => {
    try {
      await dietAPI.createMeal({ mealType });
      loadMeals();
    } catch (err) {
      alert('Erro ao criar refeição');
    }
  };

  const handleToggleComplete = async (mealId, completed) => {
    try {
      await dietAPI.updateMeal(mealId, { completed: !completed });
      loadMeals();
    } catch (err) {
      alert('Erro ao atualizar refeição');
    }
  };

  const handleAddFood = async () => {
    if (!selectedMealType) return;
    const meal = meals.find(m => m.mealType === selectedMealType);
    if (!meal) return;

    try {
      await dietAPI.addFoodItem(meal.id, foodForm);
      setShowAddModal(false);
      setFoodForm({
        name: '', quantity: '', unit: 'g', calories: '', protein: '', carbs: '', fat: '', time: '', notes: ''
      });
      loadMeals();
    } catch (err) {
      alert('Erro ao adicionar alimento');
    }
  };

  const handleRemoveFood = async (mealId, foodId) => {
    try {
      await dietAPI.removeFoodItem(mealId, foodId);
      loadMeals();
    } catch (err) {
      alert('Erro ao remover alimento');
    }
  };

  const totalCalories = meals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0);
  const completedMeals = meals.filter(m => m.completed).length;
  const adherence = meals.length > 0 ? Math.round((completedMeals / meals.length) * 100) : 0;

  return (
    <div className={styles.container}>
      <Header />
      
      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.header}>
            <h1>Plano Alimentar</h1>
            <p>Acompanhe suas refeições do dia</p>
          </section>

          <section className={styles.progress}>
            <div className={styles.progressLabel}>
              <span>{totalCalories} kcal consumidas</span>
              <span className={styles.percentage}>{adherence}% aderência</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${adherence}%` }} />
            </div>
          </section>

          <section className={styles.meals}>
            {mealTypes.map(type => {
              const meal = meals.find(m => m.mealType === type.value);
              return (
                <div key={type.value} className={styles.mealSection}>
                  <div className={styles.mealHeader}>
                    <h3>{type.label}</h3>
                    {!meal ? (
                      <button onClick={() => handleAddMeal(type.value)} className={styles.addMealBtn}>
                        + Adicionar Refeição
                      </button>
                    ) : (
                      <div className={styles.mealActions}>
                        <span>{meal.totalCalories || 0} kcal</span>
                        <input
                          type="checkbox"
                          checked={meal.completed}
                          onChange={() => handleToggleComplete(meal.id, meal.completed)}
                        />
                      </div>
                    )}
                  </div>
                  {meal && (
                    <div className={styles.foodItems}>
                      {meal.foodItems.map(food => (
                        <div key={food.id} className={styles.foodItem}>
                          <div className={styles.foodInfo}>
                            <span className={styles.foodName}>{food.name}</span>
                            <span className={styles.foodDetails}>
                              {food.quantity}{food.unit} - {food.calories} kcal
                              {food.time && ` às ${food.time}`}
                            </span>
                            {food.notes && <span className={styles.foodNotes}>{food.notes}</span>}
                          </div>
                          <button onClick={() => handleRemoveFood(meal.id, food.id)} className={styles.removeBtn}>×</button>
                        </div>
                      ))}
                      <button onClick={() => { setSelectedMealType(type.value); setShowAddModal(true); }} className={styles.addFoodBtn}>
                        + Adicionar Alimento
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {showAddModal && (
            <div className={styles.modal}>
              <div className={styles.modalContent}>
                <h3>Adicionar Alimento</h3>
                <form onSubmit={(e) => { e.preventDefault(); handleAddFood(); }}>
                  <input
                    type="text"
                    placeholder="Nome do alimento"
                    value={foodForm.name}
                    onChange={(e) => setFoodForm({...foodForm, name: e.target.value})}
                    required
                  />
                  <div className={styles.quantityRow}>
                    <input
                      type="number"
                      placeholder="Quantidade"
                      value={foodForm.quantity}
                      onChange={(e) => setFoodForm({...foodForm, quantity: e.target.value})}
                      required
                    />
                    <select
                      value={foodForm.unit}
                      onChange={(e) => setFoodForm({...foodForm, unit: e.target.value})}
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="unit">unidade</option>
                    </select>
                  </div>
                  <input
                    type="number"
                    placeholder="Calorias"
                    value={foodForm.calories}
                    onChange={(e) => setFoodForm({...foodForm, calories: e.target.value})}
                    required
                  />
                  <input
                    type="time"
                    placeholder="Horário"
                    value={foodForm.time}
                    onChange={(e) => setFoodForm({...foodForm, time: e.target.value})}
                  />
                  <textarea
                    placeholder="Observações"
                    value={foodForm.notes}
                    onChange={(e) => setFoodForm({...foodForm, notes: e.target.value})}
                  />
                  <div className={styles.modalActions}>
                    <button type="button" onClick={() => setShowAddModal(false)}>Cancelar</button>
                    <button type="submit">Adicionar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className={styles.spacer} />
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default DietPlan;