// Service para sugestão de alimentos via IA
// Preparado para futura integração com API de IA

class MealSuggestionService {
  constructor() {
    this.apiKey = process.env.AI_API_KEY; // Para futuro uso
    this.baseUrl = process.env.AI_BASE_URL; // Para futuro uso
  }

  // Modos de fala
  static MODES = {
    OBJECTIVE: 'objective',
    MOTIVATIONAL: 'motivational',
    HARDCORE: 'hardcore',
    WELCOMING: 'welcoming'
  };

  // Sugerir alimentos baseado em parâmetros
  async suggestFoods(userId, mealType, remainingCalories, goal, priceRange = 'medium', aiMode = 'objective') {
    // Simulação - em produção, chamar API de IA
    const suggestions = this.generateMockSuggestions(mealType, remainingCalories, goal, priceRange);

    // Salvar sugestão no banco
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.mealSuggestion.create({
      data: {
        userId,
        mealType,
        aiMode,
        suggestions: JSON.stringify(suggestions)
      }
    });

    return suggestions;
  }

  // Gerar sugestões mock (para desenvolvimento)
  generateMockSuggestions(mealType, remainingCalories, goal, priceRange) {
    const foods = {
      breakfast: [
        { name: 'Aveia com frutas', calories: 300, price: 'barato' },
        { name: 'Omelete com vegetais', calories: 400, price: 'medio' },
        { name: 'Smoothie proteico', calories: 350, price: 'caro' }
      ],
      lunch: [
        { name: 'Salada de quinoa', calories: 450, price: 'medio' },
        { name: 'Frango grelhado com arroz', calories: 500, price: 'barato' },
        { name: 'Salmão assado', calories: 600, price: 'caro' }
      ],
      dinner: [
        { name: 'Sopa de legumes', calories: 250, price: 'barato' },
        { name: 'Peixe com vegetais', calories: 400, price: 'medio' },
        { name: 'Bife com batata doce', calories: 550, price: 'caro' }
      ],
      snack: [
        { name: 'Iogurte natural', calories: 150, price: 'barato' },
        { name: 'Nozes', calories: 200, price: 'medio' },
        { name: 'Proteína em barra', calories: 250, price: 'caro' }
      ],
      pre_workout: [
        { name: 'Banana', calories: 100, price: 'barato' },
        { name: 'Batata doce', calories: 150, price: 'medio' },
        { name: 'Energético natural', calories: 200, price: 'caro' }
      ],
      post_workout: [
        { name: 'Iogurte com mel', calories: 200, price: 'barato' },
        { name: 'Shake de proteína', calories: 300, price: 'medio' },
        { name: 'Smoothie pós-treino', calories: 350, price: 'caro' }
      ]
    };

    const mealFoods = foods[mealType] || [];
    const filtered = mealFoods.filter(f => f.calories <= remainingCalories && f.price === priceRange);

    return filtered.slice(0, 3); // Top 3
  }

  // Calcular custo estimado da chamada de IA
  estimateCost(promptLength, responseLength) {
    // Exemplo: $0.002 por 1K tokens
    const tokens = (promptLength + responseLength) / 4; // Aproximação
    return (tokens / 1000) * 0.002;
  }
}

module.exports = MealSuggestionService;