const express = require('express');
const authMiddleware = require('../middleware/auth');
const {
  listWeightLogs,
  createWeightLog,
  updateWeightLog,
  setWeightGoal,
  getProgressOverview,
} = require('../services/progressService');

const router = express.Router();

/** GET /api/progress — weight history (legacy shape preserved) */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const progress = await listWeightLogs(req.user.id);
    res.json(progress);
  } catch (e) {
    console.error('PROGRESS LIST ERROR:', e);
    res.status(500).json({ error: e.message || 'Erro ao carregar progresso' });
  }
});

/**
 * GET /api/progress/overview
 * Factual aggregates for the Progress (Organize) page.
 * Shape is intentionally insight-ready for a future Insights page.
 */
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10);
    const overview = await getProgressOverview(req.user.id, {
      days: Number.isFinite(days) ? days : 90,
    });
    res.json({ overview });
  } catch (e) {
    console.error('PROGRESS OVERVIEW ERROR:', e);
    res.status(500).json({ error: e.message || 'Erro ao carregar visão geral' });
  }
});

/** PUT /api/progress/goal — set weight goal on StudentProfile */
router.put('/goal', authMiddleware, async (req, res) => {
  try {
    const profile = await setWeightGoal(req.user.id, req.body.targetWeight);
    res.json({
      targetWeight: profile.targetWeight,
      currentWeight: profile.currentWeight,
    });
  } catch (e) {
    console.error('PROGRESS GOAL ERROR:', e);
    res.status(400).json({ error: e.message || 'Erro ao definir meta' });
  }
});

/** POST /api/progress — register weight */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { weight, notes, date } = req.body;
    const progress = await createWeightLog(req.user.id, { weight, notes, date });
    res.json(progress);
  } catch (e) {
    console.error('PROGRESS CREATE ERROR:', e);
    res.status(400).json({ error: e.message || 'Erro ao registrar peso' });
  }
});

/** PATCH /api/progress/:id — edit weight log */
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { weight, notes, date } = req.body;
    const progress = await updateWeightLog(req.user.id, req.params.id, {
      weight,
      notes,
      date,
    });
    res.json(progress);
  } catch (e) {
    console.error('PROGRESS UPDATE ERROR:', e);
    const status = e.message?.includes('não encontrado') ? 404 : 400;
    res.status(status).json({ error: e.message || 'Erro ao atualizar peso' });
  }
});

module.exports = router;
