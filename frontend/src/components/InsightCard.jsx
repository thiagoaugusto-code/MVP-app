import React, { useState, useEffect } from 'react';
import { dailyStateAPI } from '../services/api';

function toDateKey(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const InsightCard = () => {
  const [insight, setInsight] = useState('Carregando insights...');

  useEffect(() => {
    generateInsight();
  }, []);

  const loadState = async (d) => {
    const res = await dailyStateAPI.get(toDateKey(d));
    return res.data.state;
  };

  const generateInsight = async () => {
    try {
      const today = new Date();
      const insights = [];

      for (let i = 1; i <= 3; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const s = await loadState(date);
        const breakfastMissed = !s.meals?.find((m) => m.mealType === 'breakfast')?.registered;
        const lunchMissed = !s.meals?.find((m) => m.mealType === 'lunch')?.registered;
        const dinnerMissed = !s.meals?.find((m) => m.mealType === 'dinner')?.registered;
        if (breakfastMissed && lunchMissed && dinnerMissed) {
          insights.push(`Você não registrou refeições há ${i} dias. Que tal começar hoje?`);
          break;
        }
      }

      for (let i = 1; i <= 4; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const s = await loadState(date);
        if (!s.workout?.completed) {
          if (i >= 3) {
            insights.push(`Você não treina há ${i} dias. Que tal uma sessão leve hoje?`);
            break;
          }
        } else {
          break;
        }
      }

      const todayState = await loadState(today);
      const goalMl = todayState.goals?.waterGoalMl || 2000;
      if ((todayState.waterMl || 0) < goalMl * 0.25) {
        insights.push('Lembre-se de beber água! Mantenha-se hidratado.');
      }

      if ((todayState.sleepHours ?? 0) < 6) {
        insights.push('Seu sono está baixo. Tente dormir mais para melhores resultados.');
      }

      const weekStates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        weekStates.push(await loadState(date));
      }

      const consistency =
        weekStates.reduce((acc, s) => {
          const score =
            (s.meals?.find((m) => m.mealType === 'breakfast')?.registered ? 1 : 0) +
            (s.meals?.find((m) => m.mealType === 'lunch')?.registered ? 1 : 0) +
            (s.meals?.find((m) => m.mealType === 'dinner')?.registered ? 1 : 0) +
            (s.workout?.completed ? 1 : 0);
          return acc + score;
        }, 0) /
        (7 * 4);

      if (consistency < 0.5) {
        insights.push('Sua consistência está baixa esta semana. Pequenos passos diários fazem diferença!');
      }

      if (insights.length === 0) {
        insights.push('Você está indo bem! Continue assim.');
      }

      setInsight(insights[0]);
    } catch (err) {
      setInsight('Mantenha a consistência para melhores resultados!');
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">💡 Insight do Dia</h3>
      <p className="text-gray-600">{insight}</p>
    </div>
  );
};

export default InsightCard;
