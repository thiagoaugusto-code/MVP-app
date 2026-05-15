const express = require('express');
const authMiddleware = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const MealSuggestionService = require('../services/mealSuggestionService');
const { rebuildDailyUserState } = require('../services/dailyStateService');
const {
  ensureDailyMeals,
  computeMealProgress,
  registerMeal,
  setMealRegistered,
  startOfDay,
} = require('../services/mealService');

const router = express.Router();
const prisma = new PrismaClient();
const mealSuggestionService = new MealSuggestionService();

async function syncDailyStateForMeal(userId, mealDate) {
  await rebuildDailyUserState(userId, new Date(mealDate));
}

function formatMealsResponse(meals) {
  return {
    meals,
    progress: computeMealProgress(meals),
  };
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

router.get('/', authMiddleware, async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const { meals } = await ensureDailyMeals(req.user.id, date);
    res.json(formatMealsResponse(meals));
  } catch (error) {
    console.error('Erro ao buscar refeições:', error);
    res.status(500).json({ error: 'Erro ao buscar refeições' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { mealType, date } = req.body;
    const day = startOfDay(date ? new Date(date) : new Date());
    await ensureDailyMeals(req.user.id, day);
    const meal = await prisma.meal.findFirst({
      where: { userId: req.user.id, mealType, date: day },
      include: { foodItems: true },
    });
    await rebuildDailyUserState(req.user.id, day);
    res.json(meal);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar refeição' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { completed, inGoal, registered } = req.body;
    const meal = await prisma.meal.findUnique({ where: { id: parseInt(id) } });
    if (!meal || meal.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (typeof registered === 'boolean') {
      await setMealRegistered(meal, registered);
    } else if (typeof completed === 'boolean') {
      await setMealRegistered(meal, completed);
    }

    if (typeof inGoal === 'boolean') {
      await prisma.meal.update({
        where: { id: parseInt(id) },
        data: { inGoal, updatedAt: new Date() },
      });
    }

    const updated = await prisma.meal.findUnique({
      where: { id: parseInt(id) },
      include: { foodItems: true },
    });
    await syncDailyStateForMeal(req.user.id, updated.date);

    const { meals } = await ensureDailyMeals(req.user.id, updated.date);
    res.json(formatMealsResponse(meals));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar refeição' });
  }
});

router.post('/:id/register', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { mode, photoData, note } = req.body;
    const meal = await prisma.meal.findUnique({ where: { id: parseInt(id) } });
    if (!meal || meal.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    if (!meal.inGoal) {
      return res.status(400).json({ error: 'Adicione a refeição à meta do dia antes de registrar' });
    }

    await registerMeal(meal, { mode, photoData, note });
    await syncDailyStateForMeal(req.user.id, meal.date);

    const { meals } = await ensureDailyMeals(req.user.id, meal.date);
    res.json(formatMealsResponse(meals));
  } catch (error) {
    res.status(400).json({ error: error.message || 'Erro ao registrar refeição' });
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
    await ensureDailyMeals(req.user.id, mealDate);
    await syncDailyStateForMeal(req.user.id, mealDate);
    const { meals } = await ensureDailyMeals(req.user.id, mealDate);
    res.json(formatMealsResponse(meals));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar refeição' });
  }
});

// FoodItems (legado — mantido para compatibilidade)
router.post('/:mealId/food', authMiddleware, async (req, res) => {
  try {
    const { mealId } = req.params;
    const { name, quantity, unit, calories, protein, carbs, fat, time, notes } = req.body;
    const meal = await prisma.meal.findUnique({ where: { id: parseInt(mealId) } });
    if (!meal || meal.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const foodItem = await prisma.foodItem.create({
      data: {
        mealId: parseInt(mealId),
        name,
        quantity: quantity ? Number(quantity) : null,
        unit: unit || null,
        calories: calories ? Number(calories) : null,
        protein: protein ? Number(protein) : null,
        carbs: carbs ? Number(carbs) : null,
        fat: fat ? Number(fat) : null,
        time: time
          ? new Date(`${meal.date.toISOString().split('T')[0]}T${time}:00`)
          : null,
        notes: notes || null,
      },
    });
    const totalCalories = await prisma.foodItem.aggregate({
      where: { mealId: parseInt(mealId) },
      _sum: { calories: true },
    });
    const mealRow = await prisma.meal.findUnique({ where: { id: parseInt(mealId) } });
    await prisma.meal.update({
      where: { id: parseInt(mealId) },
      data: { totalCalories: totalCalories._sum.calories || 0 },
    });
    const updatedMeal = await setMealRegistered(mealRow, true);
    await syncDailyStateForMeal(req.user.id, updatedMeal.date);
    res.json(foodItem);
  } catch (error) {
    console.error('ERRO AO CRIAR FOOD ITEM:', error);
    res.status(500).json({ error: error.message });
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
    const totalCalories = await prisma.foodItem.aggregate({
      where: { mealId: parseInt(mealId) },
      _sum: { calories: true },
    });
    const foodCount = await prisma.foodItem.count({ where: { mealId: parseInt(mealId) } });
    await prisma.meal.update({
      where: { id: parseInt(mealId) },
      data: { totalCalories: totalCalories._sum.calories || 0 },
    });
    const stillRegistered =
      foodCount > 0 || Boolean(meal.photoUrl || meal.registrationNote);
    const updatedMeal = await setMealRegistered(meal, stillRegistered);
    await syncDailyStateForMeal(req.user.id, updatedMeal.date);
    res.json({ message: 'Alimento removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover alimento' });
  }
});

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
