const express = require('express');
const authMiddleware = require('../middleware/auth');
const notificationService = require('../services/notificationService');

const router = express.Router();

router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) {
      return res.status(400).json({ message: 'Subscription inválida' });
    }

    const saved = await notificationService.savePushSubscription(req.user.id, subscription);
    res.json(saved);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao registrar subscription' });
  }
});

router.post('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint obrigatório' });
    }

    const removed = await notificationService.removePushSubscription(req.user.id, endpoint);
    res.json({ removed });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao remover subscription' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await notificationService.getNotifications(req.user.id);
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar notificações' });
  }
});

router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.user.id, parseInt(req.params.id));
    if (!notification) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }
    res.json(notification);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao marcar notificação como lida' });
  }
});

module.exports = router;