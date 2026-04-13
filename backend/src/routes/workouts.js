const express = require('express');
const authMiddleware = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { rebuildDailyUserState, toDateKey } = require('../services/dailyStateService');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req, res) => {
  const workouts = await prisma.workoutLog.findMany({ where: { userId: req.user.id } });
  res.json(workouts);
});

router.post('/', authMiddleware, async (req, res) => {
  const { name, duration } = req.body;
  const workout = await prisma.workoutLog.create({
    data: { name, duration, userId: req.user.id },
  });
  await rebuildDailyUserState(req.user.id, toDateKey(workout.date));
  res.json(workout);
});

module.exports = router;