const express = require('express');
const authMiddleware = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/profile', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, 
      name: true, 
      email: true, 
      role: true, 
      avatar: true, 
      streak: true, 
      createdAt: true, 
      updatedAt: true }
  });
  res.json(user);
});

module.exports = router;