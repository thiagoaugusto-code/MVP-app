const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

class AIChatService {
  constructor() {
    this.cache = new Map();
    this.debounceMap = new Map();
    this.costPerToken = 0.000002;
    this.apiKey = process.env.OPENAI_API_KEY || process.env.CLAUDE_API_KEY;
    this.useClaude = !!process.env.CLAUDE_API_KEY;
  }

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
        progressLogs: {
          where: { date: { gte: startDate } },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!user) return null;

    return {
      profile: user.studentProfile,
      recentMeals: (user.meals || []).slice(0, 10),
      recentChecks: (user.dailyChecks || []).slice(0, 7),
      progress: (user.progressLogs || []).slice(0, 7),
      currentStreak: this.calculateStreak(user.dailyChecks || [])
    };
  }

  calculateStreak(dailyChecks) {
    const today = new Date().toDateString();
    return dailyChecks.reduce((streak, check) => {
      if (check.date.toDateString() === today && check.done) {
        return streak + 1;
      }
      return streak;
    }, 0);
  }

  getCachedSuggestion(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCachedSuggestion(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  isDebounced(userId) {
    const lastCall = this.debounceMap.get(userId);
    if (lastCall && Date.now() - lastCall < 5000) {
      return true;
    }
    this.debounceMap.set(userId, Date.now());
    return false;
  }

  getSystemPrompt(mode, context) {
    const basePrompt = `Você é um coach de saúde e nutrição motivacional. Use português brasileiro.\nDados do usuário: ${JSON.stringify(context)}\n\nInstruções gerais:\n- Seja empático e motivacional\n- Foque em hábitos sustentáveis\n- Considere orçamento e preferências\n- Incentive consistência sobre perfeição`;

    const modePrompts = {
      coach: `${basePrompt}\nModo COACH: Seja direto, use linguagem motivacional intensa, foque em resultados.`,
      preventive: `${basePrompt}\nModo PREVENTIVO: Detecte padrões de risco (ex: gaps >2 dias), alerte gentilmente sobre recaídas.`,
      celebration: `${basePrompt}\nModo CELEBRAÇÃO: Celebre conquistas, streaks, marcos. Seja entusiasta!`,
      welcoming: `${basePrompt}\nModo ACOLHIMENTO: Seja acolhedor, incentive pequenos passos, construa confiança.`
    };

    return modePrompts[mode] || basePrompt;
  }

  async callAI(prompt, systemPrompt) {
    if (!this.apiKey) {
      throw new Error('API key n�o configurada');
    }

    try {
      if (this.useClaude) {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
          model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
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
          model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229'
        };
      }

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1024
      }, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        text: response.data.choices[0].message.content,
        tokensUsed: response.data.usage.total_tokens,
        model: process.env.OPENAI_MODEL || 'gpt-4'
      };
    } catch (error) {
      console.error('Erro na API de IA:', error.message);
      throw error;
    }
  }

  generateFallbackResponse(mode, context) {
    const fallbacks = {
      coach: `Ei! Voc� tem ${context.recentMeals.length} refei��es registradas hoje. Continue assim! ??`,
      preventive: `Notei que voc� teve alguns dias sem registrar refei��es. Que tal come�armos de novo hoje?`,
      celebration: `Parab�ns! Voc� est� mantendo uma sequ�ncia incr�vel. Continue assim! ??`,
      welcoming: `Ol�! Estou aqui para te ajudar na sua jornada de sa�de. Como voc� est� se sentindo hoje?`
    };

    return {
      text: fallbacks[mode] || fallbacks.welcoming,
      tokensUsed: 20,
      model: 'fallback',
      fallback: true
    };
  }

  async generateResponse(userId, mode, prompt) {
    try {
      if (this.isDebounced(userId)) {
        return { text: 'Aguarde um momento antes de enviar outra mensagem.', tokensUsed: 0, cost: 0 };
      }

      const context = await this.getUserContext(userId);
        if (!context) {
        return { text: 'Usuário não encontrado.', tokensUsed: 10, cost: 0 };
      }

      const todayTokens = await this.getTodayTokens(userId);
      if (todayTokens >= 50000) {
        return { text: 'Limite diário de tokens atingido. Tente novamente amanhã.', tokensUsed: 0, cost: 0 };
      }

      const cacheKey = `${userId}-${mode}-${prompt.slice(0, 50)}`;
      const cached = this.getCachedSuggestion(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }

      const systemPrompt = this.getSystemPrompt(mode, context);

      let aiResponse;
      try {
        aiResponse = await this.callAI(prompt, systemPrompt);
      } catch (error) {
        console.warn('⚠️ AI API failed, using fallback:', error.message);
        aiResponse = this.generateFallbackResponse(mode, context);
        aiResponse.fallback = true;
        aiResponse.fallbackReason = error.message;
      }

      const cost = aiResponse.tokensUsed * this.costPerToken;

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

      await this.updateChatMetrics(userId, aiResponse.tokensUsed, cost);

      const promptLower = prompt.toLowerCase();
      if (promptLower.includes('sug') || promptLower.includes('recomend')) {
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

    if (!metrics || !metrics.dailyTokensDate || metrics.dailyTokensDate < today) {
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

  async suggestMealsByBudget(userId, budget, calories) {
    const cacheKey = `meals-${userId}-${budget}-${calories}`;
    const cached = this.getCachedSuggestion(cacheKey);

    if (cached) {
      return cached;
    }

    const context = await this.getUserContext(userId);
    const prompt = `Sugira refei��es saud�veis para um or�amento de R$${budget} por dia, com aproximadamente ${calories} calorias. Considere prefer�ncias: ${context?.profile?.preferences || 'nenhuma'}`;

    const response = await this.generateResponse(userId, 'coach', prompt);
    this.setCachedSuggestion(cacheKey, response);

    return response;
  }
}

module.exports = AIChatService;
