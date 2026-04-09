const express = require('express');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const adminService = require('../services/adminService');
const { PrismaClient } = require('@prisma/client');
const socketService = require('../services/socketService');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!adminService.validateAdminCredentials(email, password)) {
      return res.status(401).json({ message: 'Credenciais de administrador inválidas' });
    }

    const token = adminService.createAdminToken();
    res.json({ token, user: { id: 0, email, role: 'ADMIN' } });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao autenticar administrador' });
  }
});

router.get('/summary', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [userCount, conversationCount, messageCount, notificationCount] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.notification.count()
    ]);

    const onlineUsers = socketService.getOnlineUsers();

    res.json({
      userCount,
      conversationCount,
      messageCount,
      notificationCount,
      onlineUsers
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar resumo administrativo' });
  }
});

router.get('/history', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        student: { select: { id: true, name: true, email: true } },
        collaborator: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 20
    });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar histórico administrativo' });
  }
});

module.exports = router;