const express = require('express');
const authMiddleware = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

function requireCollaborator(req, res) {
  const role = (req.user?.role || '').toUpperCase();
  if (role !== 'COLLABORATOR' && role !== 'ADMIN') {
    res.status(403).json({ error: 'Acesso negado' });
    return false;
  }
  return true;
}

async function getActiveStudents(collaboratorId) {
  const links = await prisma.studentCollaborator.findMany({
    where: {
      collaboratorId,
      status: 'approved',
      active: true,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          studentProfile: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return links.map((l) => ({
    id: l.student.id,
    name: l.student.name,
    email: l.student.email,
    avatar: l.student.avatar,
    goal: l.student.studentProfile?.goal || null,
    currentWeight: l.student.studentProfile?.currentWeight || null,
    targetWeight: l.student.studentProfile?.targetWeight || null,
    specialty: l.specialty,
  }));
}

async function computeTodayAdherencePercent(userId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const meals = await prisma.meal.findMany({
    where: { userId, date: { gte: start, lt: end } },
    select: { completed: true },
  });

  if (meals.length === 0) return 0;
  const completed = meals.filter((m) => m.completed).length;
  return Math.round((completed / meals.length) * 100);
}

// Dashboard: students list
router.get('/students', authMiddleware, async (req, res) => {
  try {
    if (!requireCollaborator(req, res)) return;
    const students = await getActiveStudents(req.user.id);
    const enriched = await Promise.all(
      students.map(async (s) => ({
        ...s,
        adherence: await computeTodayAdherencePercent(s.id),
      }))
    );
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar alunos' });
  }
});

// Dashboard: stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    if (!requireCollaborator(req, res)) return;
    const students = await getActiveStudents(req.user.id);
    const adherences = await Promise.all(students.map((s) => computeTodayAdherencePercent(s.id)));
    const avgAdherence =
      adherences.length > 0 ? adherences.reduce((sum, n) => sum + n, 0) / adherences.length : 0;

    res.json({
      totalStudents: students.length,
      avgAdherence,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Dashboard: alerts (placeholder, to be data-driven later)
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    if (!requireCollaborator(req, res)) return;
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar alertas' });
  }
});

// Adherence page (list students with adherence)
router.get('/adherence', authMiddleware, async (req, res) => {
  try {
    if (!requireCollaborator(req, res)) return;
    const students = await getActiveStudents(req.user.id);
    const enriched = await Promise.all(
      students.map(async (s) => ({
        id: s.id,
        name: s.name,
        specialty: s.specialty,
        adherence: await computeTodayAdherencePercent(s.id),
      }))
    );
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar aderência' });
  }
});

// Schedule page (placeholder)
router.get('/schedule', authMiddleware, async (req, res) => {
  try {
    if (!requireCollaborator(req, res)) return;
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar agenda' });
  }
});

// Student progress details used by frontend
router.get('/students/:studentId/progress', authMiddleware, async (req, res) => {
  try {
    if (!requireCollaborator(req, res)) return;
    const studentId = parseInt(req.params.studentId);
    const period = req.query.period === 'month' ? 'month' : 'week';

    // Ensure collaborator has access to student
    const link = await prisma.studentCollaborator.findFirst({
      where: {
        collaboratorId: req.user.id,
        studentId,
        status: 'approved',
        active: true,
      },
    });
    if (!link) return res.status(403).json({ error: 'Acesso negado' });

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        studentProfile: true,
      },
    });

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (period === 'month' ? 30 : 7));

    const progress = await prisma.progressLog.findMany({
      where: { userId: studentId, date: { gte: start } },
      orderBy: { date: 'desc' },
      take: period === 'month' ? 30 : 14,
    });

    res.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        currentWeight: student.studentProfile?.currentWeight || null,
        goal: student.studentProfile?.goal || null,
      },
      progress,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar progresso do aluno' });
  }
});

// Collaborator profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    if (!requireCollaborator(req, res)) return;
    const profile = await prisma.collaboratorProfile.findUnique({
      where: { userId: req.user.id },
    });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar perfil do colaborador' });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    if (!requireCollaborator(req, res)) return;
    const data = req.body || {};
    const updated = await prisma.collaboratorProfile.upsert({
      where: { userId: req.user.id },
      update: {
        bio: data.bio,
        phone: data.phone,
        codeOrCRM: data.codeOrCRM,
        experience: data.experience,
      },
      create: {
        userId: req.user.id,
        specialty: data.specialty || 'instructor',
        bio: data.bio,
        phone: data.phone,
        codeOrCRM: data.codeOrCRM,
        experience: data.experience,
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar perfil do colaborador' });
  }
});

module.exports = router;

