import React, { useState, useEffect } from 'react';
import { dailyChecksAPI } from '../services/api';

const InsightCard = () => {
  const [insight, setInsight] = useState('Carregando insights...');

  useEffect(() => {
    generateInsight();
  }, []);

  const generateInsight = async () => {
    try {
      // Buscar dados dos últimos dias
      const today = new Date();
      const insights = [];

      // Verificar refeições consecutivas faltando
      for (let i = 1; i <= 3; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const checks = await dailyChecksAPI.getChecks(date.toISOString().split('T')[0]);
        
        const breakfastMissed = !checks.data.breakfast?.done;
        const lunchMissed = !checks.data.lunch?.done;
        const dinnerMissed = !checks.data.dinner?.done;
        
        if (breakfastMissed && lunchMissed && dinnerMissed) {
          insights.push(`Você não registrou refeições há ${i} dias. Que tal começar hoje?`);
          break;
        }
      }

      // Verificar treinos consecutivos faltando
      for (let i = 1; i <= 4; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const checks = await dailyChecksAPI.getChecks(date.toISOString().split('T')[0]);
        
        if (!checks.data.workout?.done) {
          if (i >= 3) {
            insights.push(`Você não treina há ${i} dias. Que tal uma sessão leve hoje?`);
            break;
          }
        } else {
          break; // Treinou recentemente
        }
      }

      // Verificar água
      const todayChecks = await dailyChecksAPI.getChecks();
      if (todayChecks.data.water?.value < 1) {
        insights.push('Lembre-se de beber água! Mantenha-se hidratado.');
      }

      // Verificar sono
      if (todayChecks.data.sleep?.value < 6) {
        insights.push('Seu sono está baixo. Tente dormir mais para melhores resultados.');
      }

      // Consistência geral
      const weekChecks = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const checks = await dailyChecksAPI.getChecks(date.toISOString().split('T')[0]);
        weekChecks.push(checks.data);
      }
      
      const consistency = weekChecks.reduce((acc, day) => {
        const score = (day.breakfast?.done ? 1 : 0) + (day.lunch?.done ? 1 : 0) + (day.dinner?.done ? 1 : 0) + (day.workout?.done ? 1 : 0);
        return acc + score;
      }, 0) / (7 * 4);
      
      if (consistency < 0.5) {
        insights.push('Sua consistência está baixa esta semana. Pequenos passos diários fazem diferença!');
      }

      // Se não há insights específicos, usar genérico
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