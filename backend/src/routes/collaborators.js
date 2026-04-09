const express = require('express');
const authMiddleware = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Listar colaboradores disponíveis por especialidade
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { specialty } = req.query;
    const where = specialty ? { specialty } : {};
    const collaborators = await prisma.collaboratorProfile.findMany({
      where,
      include: { user: { select: { id, name, email, avatar } } },
    });
    res.json(collaborators);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar colaboradores' });
  }
});

// Solicitar acompanhamento
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { collaboratorId, specialty } = req.body;
    const studentId = req.user.id;

    // Verificar se já existe solicitação ativa
    const existing = await prisma.studentCollaborator.findFirst({
      where: { studentId, specialty, status: { in: ['pending', 'approved'] } },
    });
    if (existing) {
      return res.status(400).json({ error: 'Já existe uma solicitação ou vínculo ativo para esta especialidade' });
    }

    const request = await prisma.studentCollaborator.create({
      data: { studentId, collaboratorId, specialty },
    });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao solicitar acompanhamento' });
  }
});

// Listar solicitações do estudante
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const requests = await prisma.studentCollaborator.findMany({
      where: { studentId: req.user.id },
      include: { collaborator: { include: { collaboratorProfile: true } } },
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar solicitações' });
  }
});

// Para colaboradores: listar solicitações recebidas
router.get('/received-requests', authMiddleware, async (req, res) => {
  try {
    const requests = await prisma.studentCollaborator.findMany({
      where: { collaboratorId: req.user.id },
      include: { student: { select: { id, name, email } } },
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar solicitações recebidas' });
  }
});

// Aprovar/rejeitar solicitação
router.patch('/request/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    const request = await prisma.studentCollaborator.findUnique({ where: { id: parseInt(id) } });
    if (!request || request.collaboratorId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const updateData = { status, updatedAt: new Date() };
    if (status === 'approved') {
      updateData.approvedAt = new Date();
      updateData.active = true;
      // Desativar outros ativos da mesma especialidade
      await prisma.studentCollaborator.updateMany({
        where: { studentId: request.studentId, specialty: request.specialty, active: true },
        data: { active: false },
      });
    } else if (status === 'rejected') {
      updateData.rejectedAt = new Date();
    }

    const updated = await prisma.studentCollaborator.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar solicitação' });
  }
});

module.exports = router;