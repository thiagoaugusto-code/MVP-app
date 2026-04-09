/**
 * E2E Tests - Complete Application Flows
 * 
 * Tests the entire application flow from login through notifications
 * 
 * Run: npm test -- tests/e2e.test.js
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');

let app;
let adminToken;
let userToken;
let userId;
const prisma = new PrismaClient();
const uniqueTag = `e2e-test-${Date.now()}`;

describe('E2E: Full Application Flows', () => {
  beforeAll(async () => {
    // Setup environment
    process.env.ADMIN_EMAIL = 'admin@e2e.test';
    process.env.ADMIN_PASSWORD = 'SecureTestPass123!';
    process.env.JWT_SECRET = 'test-secret';
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'gpt-4-turbo';

    jest.resetModules();
    ({ app } = require('../src/server'));

    // Configure admin service
    const adminService = require('../src/services/adminService');

    // Wait for app initialization
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await prisma.message.deleteMany({ where: { sender: { email: { contains: uniqueTag } } } });
    await prisma.conversation.deleteMany({
      where: {
        OR: [
          { student: { email: { contains: uniqueTag } } },
          { collaborator: { email: { contains: uniqueTag } } }
        ]
      }
    });
    await prisma.aIChat.deleteMany({ where: { user: { email: { contains: uniqueTag } } } });
    await prisma.chatMetrics.deleteMany({ where: { user: { email: { contains: uniqueTag } } } });
    await prisma.notification.deleteMany({ where: { user: { email: { contains: uniqueTag } } } });
    await prisma.user.deleteMany({ where: { email: { contains: uniqueTag } } });
    await prisma.$disconnect();
  });

  describe('📋 Scenario 1: Admin Access Control', () => {
    test('should login as admin and get valid token', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.role).toBe('ADMIN');

      adminToken = response.body.token;
    });

    test('should access admin summary with valid token', async () => {
      const response = await request(app)
        .get('/api/admin/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('userCount');
      expect(response.body).toHaveProperty('conversationCount');
      expect(response.body).toHaveProperty('messageCount');
    });

    test('should reject invalid admin credentials', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpass'
        });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('🍽️ Scenario 2: Meal Registration & AI Insight', () => {
    let mealId;

    test('should register a meal for the day', async () => {
      // First, create a regular user
      const userResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: `${uniqueTag}-user@test.com`,
          password: 'password123',
          name: 'Test User',
          role: 'USER'
        });

      expect(userResponse.statusCode).toBe(201);

      // Now create meal
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: `${uniqueTag}-user@test.com`,
          password: 'password123'
        });

      userToken = loginResponse.body.token;
      userId = loginResponse.body.id;

      // Register meal
      const mealResponse = await request(app)
        .post('/api/meals')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Grilled Chicken & Salad',
          calories: 450,
          protein: 40,
          carbs: 20,
          fat: 12,
          mealType: 'lunch',
          completed: true
        });

      expect(mealResponse.statusCode).toBe(201);
      expect(mealResponse.body).toHaveProperty('id');
      mealId = mealResponse.body.id;
    });

    test('should get AI insight after meal registration', async () => {
      const response = await request(app)
        .post('/api/chat/ai')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          mode: 'coach',
          prompt: 'Acabo de registar uma refeição saudável'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('text');
      expect(response.body).toHaveProperty('tokensUsed');
      expect(response.body.tokensUsed).toBeGreaterThan(0);
    });

    test('should store meal in database', async () => {
      const user = await prisma.user.findUnique({
        where: { email: `${uniqueTag}-user@test.com` },
        include: { meals: true }
      });

      expect(user.meals.length).toBeGreaterThanOrEqual(1);
      expect(user.meals[0].name).toContain('Chicken');
    });
  });

  describe('💬 Scenario 3: Real-time Chat & Notifications', () => {
    test('should create conversation between users', async () => {
      // Create collaborator
      const collabResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: `${uniqueTag}-collab@test.com`,
          password: 'password123',
          name: 'Collaborator',
          role: 'COLLABORATOR'
        });

      expect(collabResponse.statusCode).toBe(201);

      // Create conversation
      const convResponse = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          collaboratorId: collabResponse.body.id
        });

      expect(convResponse.statusCode).toBe(201);
      expect(convResponse.body).toHaveProperty('id');
    });

    test('should send message to conversation', async () => {
      const convs = await prisma.conversation.findMany({
        where: { studentId: userId }
      });

      expect(convs.length).toBeGreaterThan(0);

      const response = await request(app)
        .post(`/api/chat/conversations/${convs[0].id}/messages`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Olá! Como você está?',
          type: 'text'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe('Olá! Como você está?');
    });

    test('should retrieve message history', async () => {
      const convs = await prisma.conversation.findMany({
        where: { studentId: userId }
      });

      const response = await request(app)
        .get(`/api/chat/conversations/${convs[0].id}/messages`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('🔔 Scenario 4: Notification System', () => {
    test('should create in-app notification', async () => {
      // Use internal notification service
      const notificationService = require('../src/services/notificationService');

      const result = await notificationService.createInAppNotification(userId, {
        title: 'Congratulations!',
        message: 'You completed your daily goals',
        type: 'achievement',
        priority: 'high'
      });

      expect(result).toHaveProperty('id');
      expect(result.title).toBe('Congratulations!');
    });

    test('should retrieve user notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should mark notification as read', async () => {
      const notifications = await prisma.notification.findMany({
        where: { userId }
      });

      if (notifications.length > 0) {
        const response = await request(app)
          .put(`/api/notifications/${notifications[0].id}/read`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(response.statusCode).toBe(200);

        const updated = await prisma.notification.findUnique({
          where: { id: notifications[0].id }
        });

        expect(updated.read).toBe(true);
      }
    });
  });

  describe('📊 Scenario 5: Data Consistency & Persistence', () => {
    test('should persist chat metrics', async () => {
      const metrics = await prisma.chatMetrics.findUnique({
        where: { userId }
      });

      if (metrics) {
        expect(metrics.dailyTokens).toBeGreaterThanOrEqual(0);
        expect(metrics.totalCost).toBeGreaterThanOrEqual(0);
      }
    });

    test('should track AI chat history', async () => {
      const chats = await prisma.aIChat.findMany({
        where: { userId }
      });

      expect(Array.isArray(chats)).toBe(true);
    });

    test('should have consistent meal records', async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          meals: true,
          mealLogs: true,
          progressLogs: true
        }
      });

      expect(user).toBeDefined();
      expect(user.meals).toBeDefined();
    });
  });

  describe('⚠️ Scenario 6: Error Handling & Recovery', () => {
    test('should handle invalid conversation ID', async () => {
      const response = await request(app)
        .get('/api/chat/conversations/99999/messages')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(404);
    });

    test('should block unauthorized access to other user messages', async () => {
      // Create another user
      const other = await prisma.user.create({
        data: {
          email: `${uniqueTag}-other@test.com`,
          password: 'hashed',
          name: 'Other User',
          role: 'USER'
        }
      });

      const convs = await prisma.conversation.findMany({
        where: { studentId: other.id }
      });

      const response = await request(app)
        .get(`/api/chat/conversations/${convs[0]?.id || 1}/messages`)
        .set('Authorization', `Bearer ${userToken}`);

      // Should 403 or 404 based on implementation
      expect([403, 404]).toContain(response.statusCode);

      // Cleanup
      await prisma.user.delete({ where: { id: other.id } });
    });
  });

  describe('⚡ Scenario 7: Performance & Latency', () => {
    test('should respond to chat requests in < 5 seconds', async () => {
      const start = Date.now();

      await request(app)
        .post('/api/chat/ai')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          mode: 'coach',
          prompt: 'Teste de latência'
        });

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    });

    test('should handle concurrent notifications', async () => {
      const notificationService = require('../src/services/notificationService');

      const promises = Array(5).fill(null).map((_, i) =>
        notificationService.createInAppNotification(userId, {
          title: `Test ${i}`,
          message: `Concurrent test ${i}`,
          type: 'reminder'
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach(r => expect(r).toHaveProperty('id'));
    });
  });
});
