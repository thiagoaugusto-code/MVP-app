const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Chat database flows', () => {
  const uniqueTag = `chat-test-${Date.now()}`;
  let student;
  let collaborator;
  let conversation;
  let message;
  let aiUser;

  beforeAll(async () => {
    student = await prisma.user.create({
      data: {
        email: `${uniqueTag}-student@test.com`,
        name: 'Student Test',
        password: 'hashed_password',
        role: 'USER'
      }
    });

    collaborator = await prisma.user.create({
      data: {
        email: `${uniqueTag}-collab@test.com`,
        name: 'Collaborator Test',
        password: 'hashed_password',
        role: 'COLLABORATOR'
      }
    });
  });

  afterAll(async () => {
    await prisma.message.deleteMany({
      where: { senderId: { in: [student?.id, collaborator?.id] } }
    });

    await prisma.conversation.deleteMany({
      where: {
        OR: [
          { studentId: student?.id || 0 },
          { collaboratorId: student?.id || 0 },
          { studentId: collaborator?.id || 0 },
          { collaboratorId: collaborator?.id || 0 }
        ]
      }
    });

    await prisma.aIChat.deleteMany({
      where: { userId: aiUser?.id || 0 }
    });

    await prisma.chatMetrics.deleteMany({
      where: { userId: aiUser?.id || 0 }
    });

    await prisma.dailyCheck.deleteMany({
      where: { userId: aiUser?.id || 0 }
    });

    await prisma.meal.deleteMany({
      where: { userId: aiUser?.id || 0 }
    });

    await prisma.user.deleteMany({
      where: { email: { contains: uniqueTag } }
    });

    await prisma.$disconnect();
  });

  test('should create, update, and delete a conversation', async () => {
    conversation = await prisma.conversation.create({
      data: {
        studentId: student.id,
        collaboratorId: collaborator.id
      }
    });

    expect(conversation.id).toBeGreaterThan(0);
    expect(conversation.studentId).toBe(student.id);
    expect(conversation.collaboratorId).toBe(collaborator.id);

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessage: 'Última mensagem de teste' }
    });

    expect(updated.lastMessage).toBe('Última mensagem de teste');

    await prisma.conversation.delete({ where: { id: conversation.id } });
    const deleted = await prisma.conversation.findUnique({ where: { id: conversation.id } });
    expect(deleted).toBeNull();
  });

  test('should create and retrieve message records', async () => {
    conversation = await prisma.conversation.create({
      data: {
        studentId: student.id,
        collaboratorId: collaborator.id
      }
    });

    message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: student.id,
        content: 'Olá, tudo bem?'
      }
    });

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id }
    });

    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect(messages[0].content).toBe('Olá, tudo bem?');

    const updatedMessage = await prisma.message.update({
      where: { id: message.id },
      data: { readAt: new Date() }
    });

    expect(updatedMessage.readAt).not.toBeNull();
  });

  test('should create AI chat, daily metrics, and cleanup', async () => {
    aiUser = await prisma.user.create({
      data: {
        email: `${uniqueTag}-ai@test.com`,
        name: 'AI Test',
        password: 'hashed_password',
        role: 'USER',
        streak: 5
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.dailyCheck.create({
      data: {
        userId: aiUser.id,
        type: 'breakfast',
        date: today,
        done: true
      }
    });

    await prisma.meal.create({
      data: {
        userId: aiUser.id,
        mealType: 'breakfast',
        date: today,
        completed: true,
        totalCalories: 350
      }
    });

    const aiChat = await prisma.aIChat.create({
      data: {
        userId: aiUser.id,
        mode: 'celebration',
        prompt: 'User completed breakfast',
        response: 'Parabéns! Você completou o café da manhã!',
        tokensUsed: 30,
        cost: 0.00006
      }
    });

    expect(aiChat.id).toBeGreaterThan(0);

    const metrics = await prisma.chatMetrics.upsert({
      where: { userId: aiUser.id },
      update: { dailyTokens: { increment: 30 } },
      create: {
        userId: aiUser.id,
        dailyTokens: 30,
        totalCost: 0.00006
      }
    });

    expect(metrics.dailyTokens).toBeGreaterThanOrEqual(30);
  });
});
