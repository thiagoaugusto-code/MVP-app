const express = require('express');
const authMiddleware = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const AIChatService = require('../services/aiChatService');

const router = express.Router();
const prisma = new PrismaClient();
const aiChatService = new AIChatService();

// Listar conversas do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { studentId: req.user.id },
          { collaboratorId: req.user.id }
        ]
      },
      include: {
        student: { select: { id, name, avatar } },
        collaborator: { select: { id, name, avatar } }
      },
      orderBy: { lastMessageAt: 'desc' }
    });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar conversas' });
  }
});

// Criar ou obter conversa com colaborador
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { collaboratorId } = req.body;
    
    // Verificar se conversa já existe
    let conversation = await prisma.conversation.findUnique({
      where: {
        studentId_collaboratorId: {
          studentId: req.user.id,
          collaboratorId: parseInt(collaboratorId)
        }
      }
    });
    
    // Se não existe, criar
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          studentId: req.user.id,
          collaboratorId: parseInt(collaboratorId)
        },
        include: {
          student: { select: { id, name, avatar } },
          collaborator: { select: { id, name, avatar } }
        }
      });
    }
    
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar conversa' });
  }
});

// Buscar mensagens de uma conversa
router.get('/:conversationId/messages', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50 } = req.query;
    
    const messages = await prisma.message.findMany({
      where: { conversationId: parseInt(conversationId) },
      include: { sender: { select: { id, name, avatar } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });
    
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

// Enviar mensagem
router.post('/:conversationId/messages', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type = 'text', metadata } = req.body;
    
    // Verificar se usuário é parte da conversa
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: parseInt(conversationId),
        OR: [
          { studentId: req.user.id },
          { collaboratorId: req.user.id }
        ]
      }
    });
    
    if (!conversation) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const message = await prisma.message.create({
      data: {
        conversationId: parseInt(conversationId),
        senderId: req.user.id,
        content,
        type,
        metadata: metadata ? JSON.stringify(metadata) : null
      },
      include: { sender: { select: { id, name, avatar } } }
    });
    
    // Atualizar conversa
    await prisma.conversation.update({
      where: { id: parseInt(conversationId) },
      data: {
        lastMessage: content,
        lastMessageAt: new Date()
      }
    });
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// Marcar mensagens como lidas
router.patch('/:conversationId/read', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    await prisma.message.updateMany({
      where: {
        conversationId: parseInt(conversationId),
        senderId: { not: req.user.id },
        readAt: null
      },
      data: { readAt: new Date() }
    });
    
    // Resetar unread count
    const isStudent = await prisma.conversation.findUnique({
      where: { id: parseInt(conversationId) },
      select: { studentId: true }
    });
    
    if (isStudent.studentId === req.user.id) {
      await prisma.conversation.update({
        where: { id: parseInt(conversationId) },
        data: { studentUnread: 0 }
      });
    } else {
      await prisma.conversation.update({
        where: { id: parseInt(conversationId) },
        data: { collaboratorUnread: 0 }
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar como lido' });
  }
});

// Chat com IA
router.post('/:conversationId/ai', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { mode = 'direct', context } = req.body;
    
    // Verificar limite de API
    const metrics = await prisma.chatMetrics.findUnique({
      where: { userId: req.user.id }
    });
    
    const today = new Date().toDateString();
    const isNewDay = metrics?.dailyTokensDate?.toDateString() !== today;
    
    const dailyTokens = isNewDay ? 0 : (metrics?.dailyTokens || 0);
    const DAILY_LIMIT = 50000; // tokens/dia
    
    if (dailyTokens > DAILY_LIMIT) {
      return res.status(429).json({ error: 'Limite diário de API atingido' });
    }
    
    // Gerar resposta da IA
    const response = await aiChatService.generateResponse(
      req.user.id,
      mode,
      context
    );
    
    // Salvar mensagem da IA
    const message = await prisma.message.create({
      data: {
        conversationId: parseInt(conversationId),
        senderId: req.user.id, // simulando IA como mensagem do usuário
        content: response.text,
        isAI: true,
        aiMode: mode,
        type: response.type || 'text'
      }
    });
    
    // Atualizar métricas
    await prisma.chatMetrics.upsert({
      where: { userId: req.user.id },
      update: {
        dailyTokens: isNewDay ? response.tokensUsed : dailyTokens + response.tokensUsed,
        dailyTokensDate: new Date(),
        totalCost: { increment: response.cost }
      },
      create: {
        userId: req.user.id,
        dailyTokens: response.tokensUsed,
        dailyTokensDate: new Date(),
        totalCost: response.cost
      }
    });
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar resposta IA' });
  }
});

module.exports = router;