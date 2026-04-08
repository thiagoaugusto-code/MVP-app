const express = require('express');
const authMiddleware = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req, res) => {
  const progress = await prisma.progressLog.findMany({ where: { userId: req.user.id } });
  res.json(progress);
});

router.post('/', authMiddleware, async (req, res) => {
  const { weight, notes } = req.body;
  const progress = await prisma.progressLog.create({
    data: { weight, notes, userId: req.user.id },
  });
  res.json(progress);
});

module.exports = router;