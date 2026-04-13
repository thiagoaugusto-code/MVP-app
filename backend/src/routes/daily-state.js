const express = require('express');
const authMiddleware = require('../middleware/auth');
const {
  getDailyState,
  applyDailyAction,
  getMonthSummary,
  getRecentSummary,
  toDateKey,
} = require('../services/dailyStateService');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const dateKey = req.query.date || toDateKey(new Date());
    const state = await getDailyState(req.user.id, dateKey);
    res.json({ state });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro ao carregar estado diário' });
  }
});

router.get('/month', authMiddleware, async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'year e month (1-12) são obrigatórios' });
    }
    const days = await getMonthSummary(req.user.id, year, month - 1);
    res.json({ days });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro ao carregar mês' });
  }
});

router.get('/recent', authMiddleware, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 7, 31);
    const items = await getRecentSummary(req.user.id, days);
    res.json({ days: items });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro ao carregar resumo recente' });
  }
});

router.post('/actions', authMiddleware, async (req, res) => {
  try {
    const { date, action, payload } = req.body;
    const dateKey = date || toDateKey(new Date());
    if (!action) return res.status(400).json({ error: 'action é obrigatório' });
    const state = await applyDailyAction(req.user.id, dateKey, action, payload || {});
    res.json({ state });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Erro ao aplicar ação' });
  }
});

module.exports = router;
