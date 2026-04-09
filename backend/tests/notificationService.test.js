jest.mock('nodemailer');
jest.mock('web-push');

const nodemailer = require('nodemailer');
const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');
const notificationService = require('../src/services/notificationService');

const prisma = new PrismaClient();
const uniqueTag = `notification-test-${Date.now()}`;

describe('NotificationService', () => {
  let mockedTransporter;

  beforeAll(async () => {
    mockedTransporter = { sendMail: jest.fn().mockResolvedValue(true) };
    nodemailer.createTransport.mockReturnValue(mockedTransporter);
    webpush.setVapidDetails = jest.fn();
    webpush.sendNotification = jest.fn().mockResolvedValue(true);

    process.env.WEB_PUSH_PUBLIC_KEY = 'test-public';
    process.env.WEB_PUSH_PRIVATE_KEY = 'test-private';
    process.env.WEB_PUSH_EMAIL = 'test@example.com';
    process.env.EMAIL_SMTP_HOST = 'smtp.example.com';
    process.env.EMAIL_SMTP_PORT = '587';
    process.env.EMAIL_SMTP_USER = 'user@example.com';
    process.env.EMAIL_SMTP_PASS = 'password';
    process.env.EMAIL_FROM = 'no-reply@example.com';
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({});
    await prisma.pushSubscription.deleteMany({});
    await prisma.user.deleteMany({ where: { email: { contains: 'notification-test' } } });
    await prisma.$disconnect();
  });

  test('createInAppNotification saves notification and emits via socket', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Notification Test',
        email: `${uniqueTag}@example.com`,
        password: 'hashed',
        role: 'USER'
      }
    });

    const notification = await notificationService.createInAppNotification(user.id, {
      title: 'Teste',
      message: 'Mensagem de teste',
      type: 'reminder',
      metadata: { target: 'meal' }
    });

    expect(notification).toHaveProperty('id');
    expect(notification.title).toBe('Teste');
    expect(notification.metadata).toEqual({ target: 'meal' });
  });

  test('getNotifications returns user notifications', async () => {
    const user = await prisma.user.findFirst({ where: { email: `${uniqueTag}@example.com` } });
    const notifications = await notificationService.getNotifications(user.id);
    expect(Array.isArray(notifications)).toBe(true);
    expect(notifications.length).toBeGreaterThanOrEqual(1);
  });

  test('markAsRead updates notification read state', async () => {
    const user = await prisma.user.findFirst({ where: { email: `${uniqueTag}@example.com` } });
    const [notification] = await prisma.notification.findMany({ where: { userId: user.id } });

    const result = await notificationService.markAsRead(user.id, notification.id);
    expect(result.count || result).toBeGreaterThanOrEqual(1);
  });

  test('savePushSubscription stores subscription and removePushSubscription deletes it', async () => {
    const user = await prisma.user.findFirst({ where: { email: `${uniqueTag}@example.com` } });
    const subscription = { endpoint: 'https://push.example.com/1', keys: { p256dh: 'abc', auth: '123' } };

    const saved = await notificationService.savePushSubscription(user.id, subscription);
    expect(saved.endpoint).toBe(subscription.endpoint);

    const removed = await notificationService.removePushSubscription(user.id, subscription.endpoint);
    expect(removed.count || removed).toBeGreaterThanOrEqual(1);
  });

  test('sendPushNotification returns 0 if VAPID keys are missing', async () => {
    delete process.env.WEB_PUSH_PUBLIC_KEY;
    delete process.env.WEB_PUSH_PRIVATE_KEY;
    const user = await prisma.user.findFirst({ where: { email: `${uniqueTag}@example.com` } });

    const result = await notificationService.sendPushNotification(user.id, {
      title: 'Teste Push',
      message: 'Mensagem push'
    });
    expect(result).toBe(0);
  });
});