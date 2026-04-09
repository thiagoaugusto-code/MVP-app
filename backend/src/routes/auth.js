const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const adminService = require('../services/adminService');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/register', async (req, res) => {
  const { name, email, password, role, specialty } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const userRole = role && role !== 'USER' ? role : 'USER';
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole,
      },
    });

    // Criar perfil baseado no role
    if (userRole === 'USER') {
      await prisma.studentProfile.create({
        data: {
          userId: user.id,
        },
      });
    } else {
      await prisma.collaboratorProfile.create({
        data: {
          userId: user.id,
          specialty: specialty || 'instructor',
        },
      });
    }

    const token = jwt.sign({ id: user.id, role: userRole }, process.env.JWT_SECRET);
    res.json({ token, user: { ...user, role: userRole } });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Erro no cadastro' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Primeiro verificar se são credenciais de admin
    if (adminService.validateAdminCredentials(email, password)) {
      const token = adminService.createAdminToken();
      return res.json({
        token,
        user: { id: 0, email, role: 'ADMIN' }
      });
    }

    // Se não for admin, verificar no banco como usuário normal
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, user });
  } catch (error) {
    res.status(400).json({ message: 'Erro no login' });
  }
});

module.exports = router;