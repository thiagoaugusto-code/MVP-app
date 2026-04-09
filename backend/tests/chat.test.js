const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Testes CRUD simples para validação
class ChatTests {
  static async testConversationCRUD() {
    try {
      console.log('🧪 Testando CRUD de Conversas...');
      
      // Criar dois usuários de teste
      const student = await prisma.user.create({
        data: {
          email: `student${Date.now()}@test.com`,
          name: 'Student Test',
          password: 'hashed_password',
          role: 'USER'
        }
      });

      const collaborator = await prisma.user.create({
        data: {
          email: `collab${Date.now()}@test.com`,
          name: 'Collaborator Test',
          password: 'hashed_password',
          role: 'COLLABORATOR'
        }
      });

      // Criar conversa
      const conversation = await prisma.conversation.create({
        data: {
          studentId: student.id,
          collaboratorId: collaborator.id
        }
      });

      console.log('✅ Conversa criada:', conversation.id);

      // Buscar conversa
      const fetched = await prisma.conversation.findUnique({
        where: { id: conversation.id }
      });

      console.log('✅ Conversa recuperada:', fetched.id);

      // Atualizar conversa
      const updated = await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessage: 'Última mensagem de teste' }
      });

      console.log('✅ Conversa atualizada:', updated.lastMessage);

      // Deletar conversa
      await prisma.conversation.delete({
        where: { id: conversation.id }
      });

      console.log('✅ Conversa deletada');

      // Limpar usuários
      await prisma.user.deleteMany({
        where: { id: { in: [student.id, collaborator.id] } }
      });

      return true;
    } catch (error) {
      console.error('❌ Erro no teste CRUD:', error.message);
      return false;
    }
  }

  static async testMessageCRUD() {
    try {
      console.log('🧪 Testando CRUD de Mensagens...');
      
      // Criar usuários
      const sender = await prisma.user.create({
        data: {
          email: `sender${Date.now()}@test.com`,
          name: 'Sender Test',
          password: 'hashed',
          role: 'USER'
        }
      });

      const receiver = await prisma.user.create({
        data: {
          email: `receiver${Date.now()}@test.com`,
          name: 'Receiver Test',
          password: 'hashed',
          role: 'COLLABORATOR'
        }
      });

      // Criar conversa
      const conversation = await prisma.conversation.create({
        data: {
          studentId: sender.id,
          collaboratorId: receiver.id
        }
      });

      // Criar mensagem
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: sender.id,
          content: 'Olá, tudo bem?'
        }
      });

      console.log('✅ Mensagem criada:', message.id);

      // Buscar mensagens
      const messages = await prisma.message.findMany({
        where: { conversationId: conversation.id }
      });

      console.log('✅ Mensagens recuperadas:', messages.length);

      // Atualizar mensagem
      const msgUpdated = await prisma.message.update({
        where: { id: message.id },
        data: { readAt: new Date() }
      });

      console.log('✅ Mensagem marcada como lida');

      // Deletar conversa (cascata deleta mensagens)
      await prisma.conversation.delete({
        where: { id: conversation.id }
      });

      // Limpar
      await prisma.user.deleteMany({
        where: { id: { in: [sender.id, receiver.id] } }
      });

      return true;
    } catch (error) {
      console.error('❌ Erro no teste de mensagens:', error.message);
      return false;
    }
  }

  static async testAIChatSync() {
    try {
      console.log('🧪 Testando Sincronização do Chat IA com Calendário...');
      
      // Criar usuário
      const user = await prisma.user.create({
        data: {
          email: `aitest${Date.now()}@test.com`,
          name: 'AI Test',
          password: 'hashed',
          role: 'USER',
          streak: 5
        }
      });

      // Criar daily checks
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const breakfast = await prisma.dailyCheck.create({
        data: {
          userId: user.id,
          type: 'breakfast',
          date: today,
          done: true
        }
      });

      const meal = await prisma.meal.create({
        data: {
          userId: user.id,
          mealType: 'breakfast',
          date: today,
          completed: true,
          totalCalories: 350
        }
      });

      console.log('✅ Daily check e meal sincronizados');

      // Criar AI chat
      const aiChat = await prisma.aIChat.create({
        data: {
          userId: user.id,
          mode: 'celebration',
          prompt: 'User completed breakfast',
          response: 'Parabéns! Você completou o café da manhã!',
          tokensUsed: 30,
          cost: 0.00006
        }
      });

      console.log('✅ AI Chat criado com sucesso');

      // Verificar metrics
      const metrics = await prisma.chatMetrics.upsert({
        where: { userId: user.id },
        update: { dailyTokens: { increment: 30 } },
        create: {
          userId: user.id,
          dailyTokens: 30,
          totalCost: 0.00006
        }
      });

      console.log('✅ Chat Metrics registradas:', metrics.dailyTokens, 'tokens');

      // Limpar
      await prisma.conversation.deleteMany({ where: { studentId: user.id } });
      await prisma.message.deleteMany({ where: { senderId: user.id } });
      await prisma.aIChat.deleteMany({ where: { userId: user.id } });
      await prisma.chatMetrics.delete({ where: { userId: user.id } });
      await prisma.meal.deleteMany({ where: { userId: user.id } });
      await prisma.dailyCheck.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });

      return true;
    } catch (error) {
      console.error('❌ Erro no teste de sync:', error.message);
      return false;
    }
  }

  static async testErrorHandling() {
    try {
      console.log('🧪 Testando Tratamento de Erros...');
      
      // Tentar criar conversa com IDs inválidos
      try {
        await prisma.conversation.create({
          data: {
            studentId: 99999,
            collaboratorId: 99999
          }
        });
        console.log('❌ Deveria ter falhado');
        return false;
      } catch (e) {
        console.log('✅ Erro de FK corretamente interceptado');
      }

      // Tentar buscar mensagem inválida
      const msg = await prisma.message.findUnique({
        where: { id: 99999 }
      });

      if (msg === null) {
        console.log('✅ Retorna null para IDs inválidos');
      }

      return true;
    } catch (error) {
      console.error('❌ Erro no teste:', error.message);
      return false;
    }
  }

  static async runAll() {
    console.log('\n========== INICIANDO TESTES ==========\n');
    
    const results = {
      conversationCRUD: await this.testConversationCRUD(),
      messageCRUD: await this.testMessageCRUD(),
      aiChatSync: await this.testAIChatSync(),
      errorHandling: await this.testErrorHandling()
    };

    console.log('\n========== RESUMO DOS TESTES ==========');
    Object.entries(results).forEach(([name, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${name}`);
    });

    const allPassed = Object.values(results).every(r => r);
    console.log(`\n${allPassed ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUNS TESTES FALHARAM'}\n`);

    await prisma.$disconnect();
    process.exit(allPassed ? 0 : 1);
  }
}

ChatTests.runAll();