const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ensureUserExists = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Usuário inválido no token' });
    }

    await prisma.user.upsert({
      where: { id: req.user.id },
      create: {
        id: req.user.id,
        name: req.user.name || 'User',
      },
      update: {},
    });

    next();
  } catch (err) {
    console.error('ensureUserExists error:', err);
    return res.status(500).json({ error: 'Erro ao validar usuário' });
  }
};

module.exports = ensureUserExists;