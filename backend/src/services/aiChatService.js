const { PrismaClient } = require('@prisma/client');
const MealSuggestionService = require('./mealSuggestionService');

const prisma = new PrismaClient();

class AIChatService {
  constructor() {
    this.mealService = new MealSuggestionService();
    this.cache = new Map(); // Cache local de sugestões
    this.costPerToken = 0.000002; // Aproximação custos
  }

  async generateResponse(userId, mode, context) {
    try {
      // Buscar histórico do usuário
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          studentProfile: true,
          dailyChecks: {
            where: {
              date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lt: new Date(new Date().setHours(24, 0, 0, 0))
              }
            }
          },
          meals: {
            where: {
              date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            },
            take: 3
          }
        }
      });

      if (!user) {
        return { text: 'Usuário não encontrado', tokensUsed: 10, cost: 0 };
      }

      // Gerar resposta baseada no mode
      let response = '';
      let tokensUsed = 50; // estimado

      switch (mode) {
        case 'direct':
          response = await this.generateDirectResponse(user, context);
          break;
        case 'welcoming':
          response = await this.generateWelcomingResponse(user, context);
          break;
        case 'hardcore':
          response = await this.generateHardcoreResponse(user, context);
          break;
        case 'preventive':
          response = await this.generatePreventiveResponse(user, context);
          break;
        case 'celebration':
          response = await this.generateCelebrationResponse(user, context);
          break;
        default:
          response = 'Olá! Como posso ajudar?';
      }

      // Calcular custo
      const cost = tokensUsed * this.costPerToken;

      return {
        text: response,
        tokensUsed,
        cost,
        type: 'text'
      };
    } catch (err) {
      console.error('Erro ao gerar resposta IA:', err);
      return {
        text: 'Desculpe, não consegui processar sua solicitação. Tente novamente.',
        tokensUsed: 10,
        cost: 0
      };
    }
  }

  async generateDirectResponse(user, context) {
    // Lembrar refeições pendentes
    const meals = user.meals || [];
    const completedMeals = meals.filter(m => m.completed).length;
    const pendingMeals = meals.length - completedMeals;

    if (pendingMeals > 0) {
      return `Você tem ${pendingMeals} refeição(ões) pendente(s) para registrar hoje. Quer fazer isso agora?`;
    }

    // Sugerir refeição se houver lacuna
    if (context?.mealType && context?.remainingCalories) {
      const suggestions = await this.mealService.generateMockSuggestions(
        context.mealType,
        context.remainingCalories,
        user.studentProfile?.goal || 'maintenance',
        context.priceRange || 'medium'
      );

      if (suggestions.length > 0) {
        return `Sugestões para ${context.mealType}: ${suggestions
          .map(s => `${s.name} (${s.calories} kcal)`)
          .join(', ')}`;
      }
    }

    return 'Tudo certo! Continue assim!';
  }

  async generateWelcomingResponse(user, context) {
    const meals = user.meals || [];
    const completedMeals = meals.filter(m => m.completed).length;

    if (completedMeals < meals.length) {
      return `Que legal que você já completou ${completedMeals} refeições! Quer ajuda com as próximas?`;
    }

    return `Parabéns por manter a consistência! Você está no caminho certo. 🎉`;
  }

  async generateHardcoreResponse(user, context) {
    const streak = user.streak || 0;

    if (streak > 0) {
      return `Você tem ${streak} dias de streak! Não abandone agora! Registre suas refeições e malhe!`;
    }

    return 'Vamos começar do zero! Registre seus dados hoje e inicie um novo streak!';
  }

  async generatePreventiveResponse(user, context) {
    // Detectar quedas
    const lastMeal = user.meals?.[0];
    const daysSinceLastMeal = lastMeal
      ? Math.floor((new Date() - lastMeal.date) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSinceLastMeal > 2) {
      return `Notei que você não registra refeições há ${daysSinceLastMeal} dias. Quer recomeçar comigo apoiando?`;
    }

    const dietCheck = user.dailyChecks?.find(c => c.type === 'breakfast');
    if (!dietCheck?.done) {
      return 'Ainda não registrou café da manhã hoje? Começa com isso para ganhar momentum!';
    }

    return 'Está tudo certo com você. Mantendo o ritmo! 💪';
  }

  async generateCelebrationResponse(user, context) {
    const streak = user.streak || 0;
    const meals = user.meals?.filter(m => m.completed) || [];

    if (streak > 7) {
      return `🔥 WOW! ${streak} dias de streak! Você é uma máquina de consistência!`;
    }

    if (meals.length === 3) {
      return `✨ Três refeições registradas hoje! Você é incrível!`;
    }

    return `⭐ Parabéns pela dedicação! Você está transformando sua vida!`;
  }

  async suggestMealsByBudget(userId, mealType, remainingCalories, budgetLevel = 'medium') {
    // Verificar cache
    const cacheKey = `${userId}-${mealType}-${budgetLevel}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const suggestions = await this.mealService.generateMockSuggestions(
      mealType,
      remainingCalories,
      'maintenance',
      budgetLevel
    );

    // Cachear por 1 hora
    this.cache.set(cacheKey, suggestions);
    setTimeout(() => this.cache.delete(cacheKey), 3600000);

    return suggestions;
  }
}

module.exports = AIChatService;