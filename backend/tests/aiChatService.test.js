const AIChatService = require('../src/services/aiChatService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
let aiService;
const uniqueSuffix = Math.random().toString(36).substring(2, 10);

// Mock axios para testes
jest.mock('axios');
const axios = require('axios');

describe('AIChatService', () => {
  beforeAll(async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.OPENAI_MODEL = 'gpt-4';
    aiService = new AIChatService();

    // Limpar dados de teste
    await prisma.aIChat.deleteMany({});
    await prisma.chatMetrics.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('getUserContext', () => {
    test('deve retornar contexto completo do usuário', async () => {
      // Criar usuário de teste
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: `test-${uniqueSuffix}@example.com`,
          password: 'hashed',
          role: 'USER',
          studentProfile: {
            create: {
              goal: 'weight loss',
              currentWeight: 70,
              targetWeight: 65,
              height: 175
            }
          }
        },
        include: { studentProfile: true }
      });

      const context = await aiService.getUserContext(user.id);

      expect(context).toHaveProperty('profile');
      expect(context.profile.goal).toBe('weight loss');
      expect(context).toHaveProperty('recentMeals');
      expect(context).toHaveProperty('recentChecks');
      expect(context).toHaveProperty('currentStreak');

      // Limpar
      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('generateResponse', () => {
    test('deve usar fallback quando API falha', async () => {
      // Mock API failure
      axios.post.mockRejectedValue(new Error('API Error'));

      const user = await prisma.user.create({
        data: {
          name: 'Fallback User',
          email: `fallback-${uniqueSuffix}@example.com`,
          password: 'hashed',
          role: 'USER'
        }
      });

      const response = await aiService.generateResponse(user.id, 'coach', 'Olá');

      expect(response.fallback).toBe(true);
      expect(response.model).toBe('fallback');
      expect(response.text).toContain('Ei!');

      // Limpar
      await prisma.user.delete({ where: { id: user.id } });
    });

    test('deve respeitar limite diário de tokens', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Limit User',
          email: `limit-${uniqueSuffix}@example.com`,
          password: 'hashed',
          role: 'USER',
          chatMetrics: {
            create: {
              dailyTokens: 50000,
              dailyTokensDate: new Date(),
              totalCost: 0
            }
          }
        },
        include: { chatMetrics: true }
      });

      const response = await aiService.generateResponse(user.id, 'coach', 'Teste');

      expect(response.text).toContain('Limite diário');
      expect(response.tokensUsed).toBe(0);

      // Limpar
      await prisma.chatMetrics.delete({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    });

    test('deve usar cache para sugestões similares', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Cache User',
          email: `cache-${uniqueSuffix}@example.com`,
          password: 'hashed',
          role: 'USER'
        }
      });

      // Mock API success
      axios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Sugestão cached' } }],
          usage: { total_tokens: 100 }
        }
      });

      // Primeira chamada
      const response1 = await aiService.generateResponse(user.id, 'coach', 'Sugira uma refeição saudável');
      expect(response1.cached).toBe(false);

      // Reset debounce state so we can verify cache behavior on the second call.
      aiService.debounceMap.delete(user.id);

      // Segunda chamada similar deve usar cache
      const response2 = await aiService.generateResponse(user.id, 'coach', 'Sugira uma refeição saudável');
      expect(response2.cached).toBe(true);

      // Limpar
      await prisma.aIChat.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('suggestMealsByBudget', () => {
    test('deve gerar sugestões baseadas em orçamento', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Budget User',
          email: `budget-${uniqueSuffix}@example.com`,
          password: 'hashed',
          role: 'USER',
          studentProfile: {
            create: {
              goal: 'maintenance',
              currentWeight: 72,
              targetWeight: 72,
              height: 175
            }
          }
        },
        include: { studentProfile: true }
      });

      // Mock API
      axios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Arroz, feijão, salada por R$15' } }],
          usage: { total_tokens: 80 }
        }
      });

      const suggestion = await aiService.suggestMealsByBudget(user.id, 30, 2000);

      expect(suggestion.text).toContain('Arroz');
      expect(suggestion.tokensUsed).toBe(80);

      // Limpar
      await prisma.aIChat.deleteMany({ where: { userId: user.id } });
      await prisma.chatMetrics.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('error handling', () => {
    test('deve lidar com usuário inexistente', async () => {
      const response = await aiService.generateResponse(99999, 'coach', 'Teste');

      expect(response.text).toBe('Usuário não encontrado.');
    });

    test('deve lidar com debounce', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Debounce User',
          email: `debounce-${uniqueSuffix}@example.com`,
          password: 'hashed',
          role: 'USER'
        }
      });

      // Primeira chamada
      await aiService.generateResponse(user.id, 'coach', 'Teste 1');

      // Segunda chamada imediata deve ser debounced
      const response2 = await aiService.generateResponse(user.id, 'coach', 'Teste 2');
      expect(response2.text).toContain('Aguarde um momento');

      // Limpar
      await prisma.aIChat.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    });
  });
});