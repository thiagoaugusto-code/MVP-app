const express = require('express');
const authMiddleware = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req, res) => {
  const meals = await prisma.mealLog.findMany({ where: { userId: req.user.id } });
  res.json(meals);
});

router.post('/', authMiddleware, async (req, res) => {
  const { name, calories } = req.body;
  const meal = await prisma.mealLog.create({
    data: { name, calories, userId: req.user.id },
  });
  res.json(meal);
});

module.exports = router;