const socketService = require('../src/services/socketService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mock socket.io
jest.mock('socket.io', () => {
  return jest.fn().mockImplementation(() => ({
    use: jest.fn(),
    on: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    cors: jest.fn(),
    pingTimeout: jest.fn(),
    pingInterval: jest.fn()
  }));
});

describe('SocketService', () => {
  beforeAll(async () => {
    // Limpar dados de teste
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('initialize', () => {
    test('deve inicializar socket.io corretamente', () => {
      const mockServer = {};
      socketService.initialize(mockServer);

      expect(socketService.io).toBeDefined();
    });
  });

  describe('authentication', () => {
    test('deve autenticar socket com token válido', () => {
      // Mock JWT
      const mockSocket = {
        handshake: {
          auth: { token: 'valid-token' },
          query: {}
        }
      };

      const mockNext = jest.fn();

      // Mock jwt.verify
      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockReturnValue({ id: 1, role: 'USER' });

      socketService.authenticateSocket(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockSocket.userId).toBe(1);
      expect(mockSocket.userRole).toBe('USER');
    });

    test('deve rejeitar socket sem token', () => {
      const mockSocket = {
        handshake: {
          auth: {},
          query: {}
        }
      };

      const mockNext = jest.fn();

      socketService.authenticateSocket(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Authentication token required'));
    });
  });

  describe('chat events', () => {
    let mockSocket;

    beforeEach(() => {
      mockSocket = {
        id: 'socket123',
        userId: 1,
        join: jest.fn(),
        leave: jest.fn(),
        emit: jest.fn(),
        to: jest.fn().mockReturnThis(),
        on: jest.fn()
      };
    });

    test('deve juntar usuário à sala de conversa', () => {
      socketService.handleChatEvents(mockSocket);

      // Simular evento join_conversation
      const joinHandler = mockSocket.on.mock.calls.find(call => call[0] === 'join_conversation')[1];
      joinHandler(123);

      expect(mockSocket.join).toHaveBeenCalledWith('conversation_123');
    });

    test('deve enviar mensagem e salvar no banco', async () => {
      // Criar usuários de teste
      const student = await prisma.user.create({
        data: {
          name: 'Test Student Socket',
          email: 'student-socket@test.com',
          password: 'hashed',
          role: 'USER'
        }
      });

      const collaborator = await prisma.user.create({
        data: {
          name: 'Test Collaborator Socket',
          email: 'collaborator-socket@test.com',
          password: 'hashed',
          role: 'COLLABORATOR'
        }
      });

      // Criar conversa de teste
      const conversation = await prisma.conversation.create({
        data: {
          studentId: student.id,
          collaboratorId: collaborator.id
        }
      });

      socketService.handleChatEvents(mockSocket);

      // Simular evento send_message
      const sendHandler = mockSocket.on.mock.calls.find(call => call[0] === 'send_message')[1];

      await sendHandler({
        conversationId: conversation.id,
        content: 'Test message',
        type: 'text',
        metadata: {}
      });

      // Verificar se mensagem foi salva
      const messages = await prisma.message.findMany({
        where: { conversationId: conversation.id }
      });

      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe('Test message');

      // Limpar
      await prisma.message.deleteMany({ where: { conversationId: conversation.id } });
      await prisma.conversation.delete({ where: { id: conversation.id } });
      await prisma.user.delete({ where: { id: student.id } });
      await prisma.user.delete({ where: { id: collaborator.id } });
    });

    test('deve marcar mensagens como lidas', async () => {
      // Criar usuários de teste
      const student = await prisma.user.create({
        data: {
          name: 'Test Student 2 Socket',
          email: 'student2-socket@test.com',
          password: 'hashed',
          role: 'USER'
        }
      });

      const collaborator = await prisma.user.create({
        data: {
          name: 'Test Collaborator 2 Socket',
          email: 'collaborator2-socket@test.com',
          password: 'hashed',
          role: 'COLLABORATOR'
        }
      });

      // Criar conversa e mensagem de teste
      const conversation = await prisma.conversation.create({
        data: {
          studentId: student.id,
          collaboratorId: collaborator.id
        }
      });

      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: collaborator.id,
          content: 'Test message'
        }
      });

      socketService.handleChatEvents(mockSocket);

      // Simular evento mark_read
      const readHandler = mockSocket.on.mock.calls.find(call => call[0] === 'mark_read')[1];
      await readHandler(conversation.id);

      // Verificar se mensagem foi marcada como lida
      const updatedMessage = await prisma.message.findUnique({
        where: { id: message.id }
      });

      expect(updatedMessage.readAt).toBeDefined();

      // Limpar
      await prisma.message.delete({ where: { id: message.id } });
      await prisma.conversation.delete({ where: { id: conversation.id } });
      await prisma.user.delete({ where: { id: student.id } });
      await prisma.user.delete({ where: { id: collaborator.id } });
    });
  });

  describe('presence tracking', () => {
    test('deve rastrear conexões de usuário', () => {
      const userId = 1;
      const socketId = 'socket123';

      socketService.trackUserConnection(userId, socketId);

      expect(socketService.userSockets.has(userId)).toBe(true);
      expect(socketService.userSockets.get(userId).has(socketId)).toBe(true);
      expect(socketService.socketUsers.get(socketId)).toBe(userId);
    });

    test('deve rastrear desconexões de usuário', () => {
      const userId = 1;
      const socketId = 'socket123';

      socketService.trackUserConnection(userId, socketId);
      socketService.trackUserDisconnection(userId, socketId);

      expect(socketService.userSockets.has(userId)).toBe(false);
      expect(socketService.socketUsers.has(socketId)).toBe(false);
    });
  });

  describe('utility methods', () => {
    test('deve verificar se usuário está online', () => {
      const userId = 1;
      const socketId = 'socket123';

      expect(socketService.isUserOnline(userId)).toBe(false);

      socketService.trackUserConnection(userId, socketId);
      expect(socketService.isUserOnline(userId)).toBe(true);

      socketService.trackUserDisconnection(userId, socketId);
      expect(socketService.isUserOnline(userId)).toBe(false);
    });

    test('deve retornar lista de usuários online', () => {
      const user1 = 1;
      const user2 = 2;

      socketService.trackUserConnection(user1, 'socket1');
      socketService.trackUserConnection(user2, 'socket2');

      const onlineUsers = socketService.getOnlineUsers();
      expect(onlineUsers).toContain(user1);
      expect(onlineUsers).toContain(user2);

      socketService.trackUserDisconnection(user1, 'socket1');
      socketService.trackUserDisconnection(user2, 'socket2');
    });
  });
});