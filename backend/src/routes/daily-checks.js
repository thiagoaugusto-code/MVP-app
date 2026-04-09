const express = require('express');
const authMiddleware = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Buscar checks do dia
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const checkDate = date ? new Date(date) : new Date();
    
    const checks = await prisma.dailyCheck.findMany({
      where: {
        userId: req.user.id,
        date: {
          gte: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate()),
          lt: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() + 1),
        },
      },
    });
    
    // Retornar como objeto keyed by type
    const checksObj = {};
    checks.forEach(check => {
      checksObj[check.type] = check;
    });
    
    res.json(checksObj);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar checks diários' });
  }
});

// Atualizar ou criar check
router.patch('/:type', authMiddleware, async (req, res) => {
  try {
    const { type } = req.params;
    const { done, value } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const check = await prisma.dailyCheck.upsert({
      where: {
        userId_date_type: {
          userId: req.user.id,
          date: today,
          type,
        },
      },
      update: { done, value },
      create: {
        userId: req.user.id,
        date: today,
        type,
        done: done || false,
        value,
      },
    });
    
    // Recalcular streak se for workout ou meal
    if (type === 'workout' || type === 'meal') {
      await updateStreak(req.user.id);
    }
    
    res.json(check);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar check' });
  }
});

async function updateStreak(userId) {
  // Lógica simples: contar dias consecutivos com workout e meal done
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let streak = 0;
  let currentDate = new Date(today);
  
  while (true) {
    const checks = await prisma.dailyCheck.findMany({
      where: {
        userId,
        date: currentDate,
        type: { in: ['workout', 'meal'] },
        done: true,
      },
    });
    
    if (checks.length < 2) break; // Precisa de workout e meal
    
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: { streak },
  });
}

module.exports = router;