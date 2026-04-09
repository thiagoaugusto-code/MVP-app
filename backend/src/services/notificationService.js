const nodemailer = require('nodemailer');
const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class NotificationService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_SMTP_PORT || 587),
      secure: process.env.EMAIL_SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_SMTP_USER,
        pass: process.env.EMAIL_SMTP_PASS
      }
    });

    // Configure web push only if keys are present
    if (process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:' + (process.env.WEB_PUSH_EMAIL || 'notifications@example.com'),
        process.env.WEB_PUSH_PUBLIC_KEY,
        process.env.WEB_PUSH_PRIVATE_KEY
      );
    }


    this.templates = {
      daily_summary: this.generateDailySummaryTemplate,
      weekly_report: this.generateWeeklyReportTemplate,
      achievement: this.generateAchievementTemplate,
      reminder: this.generateReminderTemplate
    };
  }

  // In-app notifications
  async createInAppNotification(userId, data) {
    const { title, message, type, priority = 'normal' } = data;

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        priority,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null
      }
    });

    const payload = {
      id: notification.id,
      title,
      message,
      type,
      priority,
      createdAt: notification.createdAt,
      metadata: data.metadata || null
    };

    try {
      const socketService = require('./socketService');
      if (socketService && socketService.io && typeof socketService.emitToUser === 'function') {
        socketService.emitToUser(userId, 'new_notification', payload);
      }
    } catch (error) {
      // If real-time socket delivery is unavailable during tests or startup, ignore it.
    }

    return {
      ...notification,
      metadata: payload.metadata
    };
  }

  // Push notifications (web/mobile)
  async sendPushNotification(userId, data) {
    try {
      if (!process.env.WEB_PUSH_PUBLIC_KEY || !process.env.WEB_PUSH_PRIVATE_KEY) {
        return 0;
      }

      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId }
      });

      const payload = JSON.stringify({
        title: data.title,
        body: data.message,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: data.metadata || {}
      });

      const results = await Promise.allSettled(
        subscriptions.map((sub) => {
          let subscription;
          try {
            subscription = JSON.parse(sub.subscription);
          } catch (error) {
            subscription = null;
          }
          if (!subscription) return Promise.reject(new Error('Invalid push subscription payload'));
          return webpush.sendNotification(subscription, payload);
        })
      );

      // Log results
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Push notification failed for subscription ${index}:`, result.reason);
        }
      });

      return results.filter(r => r.status === 'fulfilled').length;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return 0;
    }
  }

  // Email notifications
  async sendEmail(userId, templateType, data) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      });

      if (!user?.email) return false;

      const template = this.templates[templateType];
      if (!template) return false;

      const emailContent = await template(user, data);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  // Smart notification triggers
  async triggerMealReminder(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        meals: {
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(24, 0, 0, 0))
            }
          }
        }
      }
    });

    const completedMeals = user.meals.filter(m => m.completed).length;
    const totalMeals = user.meals.length;

    if (completedMeals < totalMeals) {
      const pendingMeals = totalMeals - completedMeals;

      await this.createInAppNotification(userId, {
        title: 'Refeições Pendentes',
        message: `Você tem ${pendingMeals} refeição(ões) para registrar hoje.`,
        type: 'reminder',
        priority: 'high'
      });

      await this.sendPushNotification(userId, {
        title: 'Refeições Pendentes',
        message: `Complete suas ${pendingMeals} refeições restantes!`,
        metadata: { type: 'meal_reminder', pendingMeals }
      });
    }
  }

  async triggerStreakCelebration(userId, streak) {
    if (streak >= 7) {
      await this.createInAppNotification(userId, {
        title: 'Sequência Incrível! 🔥',
        message: `Parabéns! Você mantém ${streak} dias de consistência!`,
        type: 'achievement',
        priority: 'high'
      });

      await this.sendEmail(userId, 'achievement', { streak });
    }
  }

  async triggerGapAlert(userId, daysWithoutMeals) {
    if (daysWithoutMeals >= 2) {
      await this.createInAppNotification(userId, {
        title: 'Que tal recomeçar?',
        message: `Notamos que você não registra refeições há ${daysWithoutMeals} dias. Vamos juntos!`,
        type: 'reminder',
        priority: 'high'
      });

      await this.sendPushNotification(userId, {
        title: 'Hora de voltar!',
        message: `${daysWithoutMeals} dias sem registros. Seu corpo agradece!`,
        metadata: { type: 'gap_alert', days: daysWithoutMeals }
      });
    }
  }

  // Scheduled notifications
  async sendDailySummary(userId) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        meals: {
          where: {
            date: {
              gte: new Date(yesterday.setHours(0, 0, 0, 0)),
              lt: new Date(yesterday.setHours(24, 0, 0, 0))
            }
          }
        },
        dailyChecks: {
          where: {
            date: {
              gte: new Date(yesterday.setHours(0, 0, 0, 0)),
              lt: new Date(yesterday.setHours(24, 0, 0, 0))
            }
          }
        }
      }
    });

    if (user) {
      await this.sendEmail(userId, 'daily_summary', {
        meals: user.meals,
        checks: user.dailyChecks
      });
    }
  }

  async sendWeeklyReport(userId) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        meals: {
          where: { date: { gte: weekAgo } }
        },
        progressLogs: {
          where: { date: { gte: weekAgo } }
        }
      }
    });

    if (user) {
      await this.sendEmail(userId, 'weekly_report', {
        meals: user.meals,
        progress: user.progressLogs
      });
    }
  }

  // Email templates
  generateDailySummaryTemplate(user, data) {
    const completedMeals = data.meals.filter(m => m.completed).length;
    const totalMeals = data.meals.length;

    return {
      subject: `Resumo Diário - ${user.name}`,
      html: `
        <h2>Olá ${user.name}!</h2>
        <p>Aqui está seu resumo de ontem:</p>
        <ul>
          <li>Refeições completadas: ${completedMeals}/${totalMeals}</li>
          <li>Calorias totais: ${data.meals.reduce((sum, m) => sum + m.totalCalories, 0)}</li>
        </ul>
        <p>Continue assim! 💪</p>
      `,
      text: `Olá ${user.name}! Ontem você completou ${completedMeals}/${totalMeals} refeições. Continue assim!`
    };
  }

  generateWeeklyReportTemplate(user, data) {
    const totalMeals = data.meals.length;
    const avgCalories = totalMeals > 0
      ? Math.round(data.meals.reduce((sum, m) => sum + m.totalCalories, 0) / totalMeals)
      : 0;

    return {
      subject: `Relatório Semanal - ${user.name}`,
      html: `
        <h2>Seu Relatório Semanal</h2>
        <p>Olá ${user.name}, aqui está seu desempenho na última semana:</p>
        <ul>
          <li>Total de refeições: ${totalMeals}</li>
          <li>Média calórica: ${avgCalories} kcal</li>
          <li>Registros de progresso: ${data.progress.length}</li>
        </ul>
        <p>Excelente trabalho! 🎉</p>
      `,
      text: `Olá ${user.name}! Na última semana você registrou ${totalMeals} refeições com média de ${avgCalories} calorias.`
    };
  }

  generateAchievementTemplate(user, data) {
    return {
      subject: `Parabéns pela sua conquista! 🏆`,
      html: `
        <h2>Incrível, ${user.name}!</h2>
        <p>Você atingiu uma sequência de ${data.streak} dias!</p>
        <p>Isso mostra dedicação e consistência. Continue assim! 🚀</p>
      `,
      text: `Parabéns ${user.name}! Você atingiu ${data.streak} dias de sequência!`
    };
  }

  generateReminderTemplate(user, data) {
    return {
      subject: `Lembrete: Hora de cuidar da saúde!`,
      html: `
        <h2>Olá ${user.name}!</h2>
        <p>Que tal registrar suas refeições hoje?</p>
        <p>Lembre-se: consistência é a chave para resultados duradouros! 💪</p>
      `,
      text: `Olá ${user.name}! Não esqueça de registrar suas refeições hoje.`
    };
  }

  async getNotifications(userId) {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return notifications.map((notification) => ({
      ...notification,
      metadata: notification.metadata ? JSON.parse(notification.metadata) : null
    }));
  }

  async markAsRead(userId, notificationId) {
    const updated = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true }
    });
    return updated;
  }

  // Push subscription management
  async savePushSubscription(userId, subscription) {
    const endpoint = subscription.endpoint;
    return await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        subscription: JSON.stringify(subscription),
        userId,
        updatedAt: new Date()
      },
      create: {
        userId,
        endpoint,
        subscription: JSON.stringify(subscription)
      }
    });
  }

  async removePushSubscription(userId, endpoint) {
    return await prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint
      }
    });
  }
}

module.exports = new NotificationService();