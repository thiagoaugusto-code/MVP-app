const express = require('express');
const authMiddleware = require('../middleware/auth');
const {
  getDailyState,
  applyDailyAction,
  getRecentSummary,
  getMonthSummary,
} = require('../services/dailyStateService');

const router = express.Router();

/**
 * GET /api/daily-state?date=YYYY-MM-DD
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const date = req.query.date || new Date();

    const state = await getDailyState(req.user.id, date);

    res.json({ state });
  } catch (e) {
    console.error('🔥 DAILY STATE ERROR:', e);

    res.status(500).json({
      error: e.message || 'Erro ao carregar estado diário',
    });
  }
});

/**
 * GET /api/daily-state/month?year=2026&month=4
 */
router.get('/month', authMiddleware, async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        error: 'year e month (1-12) são obrigatórios',
      });
    }

    const days = await getMonthSummary(req.user.id, year, month - 1);

    res.json({ days });
  } catch (e) {
    console.error('🔥 MONTH ERROR:', e);

    res.status(500).json({
      error: e.message || 'Erro ao carregar mês',
    });
  }
});

/**
 * GET /api/daily-state/recent?days=7
 */
router.get('/recent', authMiddleware, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 7, 31);

    const items = await getRecentSummary(req.user.id, days);

    res.json({ days: items });
  } catch (e) {
    console.error('🔥 RECENT ERROR:', e);

    res.status(500).json({
      error: e.message || 'Erro ao carregar resumo recente',
    });
  }
});

/**
 * POST /api/daily-state/actions
 */
router.post('/actions', authMiddleware, async (req, res) => {
  try {
    const { date, action, payload } = req.body;

    const finalDate = date || new Date().toISOString();

    if (!action) {
      return res.status(400).json({ error: 'action é obrigatório' });
    }

    const state = await applyDailyAction(
      req.user.id,
      finalDate,
      action,
      payload || {}
    );

    res.json({ state });
  } catch (e) {
    console.error('🔥 ACTION ERROR:', e);

    res.status(400).json({
      error: e.message || 'Erro ao aplicar ação',
    });
  }
});

module.exports = router;