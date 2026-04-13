const express = require('express');
const authMiddleware = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const MealSuggestionService = require('../services/mealSuggestionService');
const { rebuildDailyUserState, toDateKey } = require('../services/dailyStateService');

const router = express.Router();
const prisma = new PrismaClient();
const mealSuggestionService = new MealSuggestionService();

async function syncDailyStateForMeal(userId, mealDate) {
  const dk = toDateKey(mealDate instanceof Date ? mealDate : new Date(mealDate));
  await rebuildDailyUserState(userId, dk);
}

// Mantendo MealLog para compatibilidade
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const meals = await prisma.mealLog.findMany({ where: { userId: req.user.id } });
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar logs de refeições' });
  }
});

router.post('/logs', authMiddleware, async (req, res) => {
  try {
    const { name, calories, protein, carbs, fat, mealType } = req.body;
    const meal = await prisma.mealLog.create({
      data: { name, calories, protein, carbs, fat, mealType, userId: req.user.id },
    });
    res.json(meal);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar log de refeição' });
  }
});

// Novos endpoints para Meal (refeições estruturadas)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const where = { userId: req.user.id };
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.date = { gte: start, lt: end };
    }
    const meals = await prisma.meal.findMany({
      where,
      include: { foodItems: true },
      orderBy: { date: 'asc' },
    });
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar refeições' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { mealType, date } = req.body;
    const meal = await prisma.meal.create({
      data: { mealType, date: date ? new Date(date) : new Date(), userId: req.user.id },
    });
    await syncDailyStateForMeal(req.user.id, meal.date);
    res.json(meal);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar refeição' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    const meal = await prisma.meal.findUnique({ where: { id: parseInt(id) } });
    if (!meal || meal.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const updated = await prisma.meal.update({
      where: { id: parseInt(id) },
      data: { completed, updatedAt: new Date() },
    });
    await syncDailyStateForMeal(req.user.id, updated.date);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar refeição' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const meal = await prisma.meal.findUnique({ where: { id: parseInt(id) } });
    if (!meal || meal.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const mealDate = meal.date;
    await prisma.meal.delete({ where: { id: parseInt(id) } });
    await syncDailyStateForMeal(req.user.id, mealDate);
    res.json({ message: 'Refeição deletada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar refeição' });
  }
});

// FoodItems
router.post('/:mealId/food', authMiddleware, async (req, res) => {
  try {
    const { mealId } = req.params;
    const { name, quantity, unit, calories, protein, carbs, fat, time, notes } = req.body;
    const meal = await prisma.meal.findUnique({ where: { id: parseInt(mealId) } });
    if (!meal || meal.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const foodItem = await prisma.foodItem.create({
      data: { mealId: parseInt(mealId), name, quantity, unit, calories, protein, carbs, fat, time, notes },
    });
    // Atualizar totalCalories da meal
    const totalCalories = await prisma.foodItem.aggregate({
      where: { mealId: parseInt(mealId) },
      _sum: { calories: true },
    });
    const updatedMeal = await prisma.meal.update({
      where: { id: parseInt(mealId) },
      data: { totalCalories: totalCalories._sum.calories || 0 },
    });
    await syncDailyStateForMeal(req.user.id, updatedMeal.date);
    res.json(foodItem);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar alimento' });
  }
});

router.delete('/:mealId/food/:id', authMiddleware, async (req, res) => {
  try {
    const { mealId, id } = req.params;
    const foodItem = await prisma.foodItem.findUnique({ where: { id: parseInt(id) } });
    if (!foodItem || foodItem.mealId !== parseInt(mealId)) {
      return res.status(404).json({ error: 'Alimento não encontrado' });
    }
    const meal = await prisma.meal.findUnique({ where: { id: parseInt(mealId) } });
    if (!meal || meal.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    await prisma.foodItem.delete({ where: { id: parseInt(id) } });
    // Recalcular totalCalories
    const totalCalories = await prisma.foodItem.aggregate({
      where: { mealId: parseInt(mealId) },
      _sum: { calories: true },
    });
    const updatedMeal = await prisma.meal.update({
      where: { id: parseInt(mealId) },
      data: { totalCalories: totalCalories._sum.calories || 0 },
    });
    await syncDailyStateForMeal(req.user.id, updatedMeal.date);
    res.json({ message: 'Alimento removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover alimento' });
  }
});

// Sugestões de alimentos via IA
router.post('/suggest', authMiddleware, async (req, res) => {
  try {
    const { mealType, remainingCalories, goal, priceRange, aiMode } = req.body;
    const suggestions = await mealSuggestionService.suggestFoods(
      req.user.id, mealType, remainingCalories, goal, priceRange, aiMode
    );
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar sugestões' });
  }
});

// Buscar sugestões anteriores
router.get('/suggestions', authMiddleware, async (req, res) => {
  try {
    const suggestions = await prisma.mealSuggestion.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(suggestions.map(s => ({ ...s, suggestions: JSON.parse(s.suggestions) })));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar sugestões' });
  }
});

module.exports = router;