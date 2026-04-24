const express = require('express');
const authMiddleware = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { rebuildDailyUserState } = require('../services/dailyStateService');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Helper: garante data limpa (início do dia)
 */
function normalizeDate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * GET - listar treinos do usuário
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const workouts = await prisma.workout.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
    });

    res.json(workouts);
  } catch (error) {
    console.error('WORKOUT GET ERROR:', error);
    res.status(500).json({ error: 'Erro ao buscar treinos' });
  }
});

/**
 * POST - criar treino
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { date } = req.body;

    const workout = await prisma.workout.create({
      data: {
        userId: req.user.id,
        date: date ? normalizeDate(date) : normalizeDate(new Date()),
        completed: false,
      },
    });

    await rebuildDailyUserState(req.user.id, workout.date);

    res.json(workout);
  } catch (error) {
    console.error('WORKOUT CREATE ERROR:', error);
    res.status(500).json({ error: 'Erro ao criar treino' });
  }
});

/**
 * PATCH - atualizar treino (concluir / editar)
 */
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;

    const workout = await prisma.workout.findUnique({
      where: { id: parseInt(id) },
    });

    if (!workout || workout.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const updated = await prisma.workout.update({
      where: { id: parseInt(id) },
      data: {
        completed: Boolean(completed),
      },
    });

    await rebuildDailyUserState(req.user.id, updated.date);

    res.json(updated);
  } catch (error) {
    console.error('WORKOUT UPDATE ERROR:', error);
    res.status(500).json({ error: 'Erro ao atualizar treino' });
  }
});

/**
 * DELETE - remover treino
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const workout = await prisma.workout.findUnique({
      where: { id: parseInt(id) },
    });

    if (!workout || workout.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const workoutDate = workout.date;

    await prisma.workout.delete({
      where: { id: parseInt(id) },
    });

    await rebuildDailyUserState(req.user.id, workoutDate);

    res.json({ message: 'Treino deletado' });
  } catch (error) {
    console.error('WORKOUT DELETE ERROR:', error);
    res.status(500).json({ error: 'Erro ao deletar treino' });
  }
});

module.exports = router;