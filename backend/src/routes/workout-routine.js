const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth'); // 👈 IMPORTANTE

const prisma = new PrismaClient();

// 🔥 CREATE BULK ROUTINES
router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    console.log("REQ.USER:", req.user); // 👈 debug

    const userId = req.user.id;
    const routines = req.body;

    if (!Array.isArray(routines)) {
      return res.status(400).json({ error: 'Formato inválido' });
    }

    await prisma.workoutRoutine.deleteMany({
      where: { userId },
    });

    await prisma.workoutRoutine.createMany({
      data: routines.map(r => ({
        userId,
        weekday: r.weekday,
        name: r.name,
        type: r.type,
      })),
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar rotina' });
  }
});

module.exports = router;