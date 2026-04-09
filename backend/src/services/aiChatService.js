const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

class AIChatService {
  constructor() {
    this.cache = new Map(); // Cache para sugestões (TTL 1 hora)
    this.debounceMap = new Map(); // Debounce para evitar spam
    this.costPerToken = 0.000002; // OpenAI/Claude aproximado
    this.apiKey = process.env.OPENAI_API_KEY || process.env.CLAUDE_API_KEY;
    this.useClaude = !!process.env.CLAUDE_API_KEY;
  }

  // Smart Context Window - 7 dias de dados
  async getUserContext(userId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        dailyChecks: {
          where: { date: { gte: startDate } },
          orderBy: { date: 'desc' }
        },
        meals: {
          where: { date: { gte: startDate } },
          orderBy: { date: 'desc' }
        },
        progress: {
          where: { date: { gte: startDate } },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!user) return null;

    // Calcular streak atual
    const streak = this.calculateStreak(user.dailyChecks);

    return {
      profile: user.studentProfile,
      recentMeals: user.meals.slice(0, 10),
      recentChecks: user.dailyChecks.slice(0, 7),
      progress: user.progress.slice(0, 7),
      currentStreak: streak
    };
  }

  calculateStreak(dailyChecks) {
    let streak = 0;
    const today = new Date().toDateString();

    for (const check of dailyChecks) {
      if (check.date.toDateString() === today && check.completed) {
        streak++;
        break;
      }
    }

    return streak;
  }

  // Cache inteligente com TTL
  getCachedSuggestion(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hora
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCachedSuggestion(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Debounce para evitar chamadas excessivas
  isDebounced(userId) {
    const lastCall = this.debounceMap.get(userId);
    if (lastCall && Date.now() - lastCall < 5000) { // 5 segundos
      return true;
    }
    this.debounceMap.set(userId, Date.now());
    return false;
  }

  // Modos de fala personalizáveis
  getSystemPrompt(mode, context) {
    const basePrompt = `Você é um coach de saúde e nutrição motivacional. Use português brasileiro.
Dados do usuário: ${JSON.stringify(context)}

Instruções gerais:
- Seja empático e motivacional
- Foque em hábitos sustentáveis
- Considere orçamento e preferências
- Incentive consistência sobre perfeição`;

    const modePrompts = {
      coach: `${basePrompt}
Modo COACH: Seja direto, use linguagem motivacional intensa, foque em resultados.`,

      preventivo: `${basePrompt}
Modo PREVENTIVO: Detecte padrões de risco (ex: gaps >2 dias), alerte gentilmente sobre recaídas.`,

      celebracao: `${basePrompt}
Modo CELEBRAÇÃO: Celebre conquistas, streaks, marcos. Seja entusiasta!`,

      acolhimento: `${basePrompt}
Modo ACOLHIMENTO: Seja acolhedor, incentive pequenos passos, construa confiança.`
    };

    return modePrompts[mode] || basePrompt;
  }

  // Chamada real para IA (OpenAI ou Claude)
  async callAI(prompt, systemPrompt) {
    if (!this.apiKey) {
      throw new Error('API key não configurada');
    }

    try {
      if (this.useClaude) {
        // Claude API
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        }, {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          }
        });

        return {
          text: response.data.content[0].text,
          tokensUsed: response.data.usage.input_tokens + response.data.usage.output_tokens,
          model: 'claude-3-sonnet'
        };
      } else {
        // OpenAI API
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1024
        }, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        return {
          text: response.data.choices[0].message.content,
          tokensUsed: response.data.usage.total_tokens,
          model: 'gpt-4'
        };
      }
    } catch (error) {
      console.error('Erro na API de IA:', error.message);
      throw error;
    }
  }

  // Fallback local quando API falha
  generateFallbackResponse(mode, context) {
    const fallbacks = {
      coach: `Ei! Você tem ${context.recentMeals.length} refeições registradas hoje. Continue assim! 💪`,
      preventivo: `Notei que você teve alguns dias sem registrar refeições. Que tal começarmos de novo hoje?`,
      celebracao: `Parabéns! Você está mantendo uma sequência incrível. Continue assim! 🎉`,
      acolhimento: `Olá! Estou aqui para te ajudar na sua jornada de saúde. Como você está se sentindo hoje?`
    };

    return {
      text: fallbacks[mode] || fallbacks.acolhimento,
      tokensUsed: 20,
      model: 'fallback',
      fallback: true
    };
  }

  // Método principal
  async generateResponse(userId, mode, prompt) {
    try {
      // Verificar debounce
      if (this.isDebounced(userId)) {
        return { text: 'Aguarde um momento antes de enviar outra mensagem.', tokensUsed: 0, cost: 0 };
      }

      // Buscar contexto do usuário
      const context = await this.getUserContext(userId);
      if (!context) {
        return { text: 'Usuário não encontrado.', tokensUsed: 10, cost: 0 };
      }

      // Verificar limites diários
      const todayTokens = await this.getTodayTokens(userId);
      if (todayTokens >= 50000) {
        return { text: 'Limite diário de tokens atingido. Tente novamente amanhã.', tokensUsed: 0, cost: 0 };
      }

      // Tentar cache para sugestões
      const cacheKey = `${userId}-${mode}-${prompt.slice(0, 50)}`;
      const cached = this.getCachedSuggestion(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }

      // Gerar system prompt
      const systemPrompt = this.getSystemPrompt(mode, context);

      // Chamar IA real
      let aiResponse;
      try {
        aiResponse = await this.callAI(prompt, systemPrompt);
      } catch (error) {
        console.warn('Fallback para resposta local:', error.message);
        aiResponse = this.generateFallbackResponse(mode, context);
      }

      // Calcular custo
      const cost = aiResponse.tokensUsed * this.costPerToken;

      // Salvar no banco
      await prisma.aIChat.create({
        data: {
          userId,
          mode,
          prompt,
          response: aiResponse.text,
          tokensUsed: aiResponse.tokensUsed,
          cost,
          cached: false
        }
      });

      // Atualizar métricas
      await this.updateChatMetrics(userId, aiResponse.tokensUsed, cost);

      // Cache se for sugestão
      if (prompt.toLowerCase().includes('sugest') || prompt.toLowerCase().includes('recomend')) {
        this.setCachedSuggestion(cacheKey, aiResponse);
      }

      return {
        ...aiResponse,
        cost,
        cached: false
      };

    } catch (error) {
      console.error('Erro no AI Chat Service:', error);
      return {
        text: 'Desculpe, houve um erro. Tente novamente.',
        tokensUsed: 10,
        cost: 0,
        error: true
      };
    }
  }

  async getTodayTokens(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const metrics = await prisma.chatMetrics.findUnique({
      where: { userId }
    });

    if (!metrics || metrics.dailyTokensDate < today) {
      return 0;
    }

    return metrics.dailyTokens;
  }

  async updateChatMetrics(userId, tokensUsed, cost) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.chatMetrics.upsert({
      where: { userId },
      update: {
        dailyTokens: { increment: tokensUsed },
        totalCost: { increment: cost }
      },
      create: {
        userId,
        dailyTokens: tokensUsed,
        dailyTokensDate: today,
        totalCost: cost
      }
    });
  }

  // Método para sugestões alimentares com cache
  async suggestMealsByBudget(userId, budget, calories) {
    const cacheKey = `meals-${userId}-${budget}-${calories}`;
    const cached = this.getCachedSuggestion(cacheKey);

    if (cached) {
      return cached;
    }

    const context = await this.getUserContext(userId);
    const prompt = `Sugira refeições saudáveis para um orçamento de R$${budget} por dia, com aproximadamente ${calories} calorias. Considere preferências: ${context?.profile?.preferences || 'nenhuma'}`;

    const response = await this.generateResponse(userId, 'coach', prompt);
    this.setCachedSuggestion(cacheKey, response);

    return response;
  }
}

module.exports = AIChatService;