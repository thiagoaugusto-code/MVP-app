const request = require('supertest');
let app;
let adminService;

describe('AdminService and Admin Routes', () => {
  beforeAll(() => {
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'supersecret';
    process.env.JWT_SECRET = 'test-secret';

    jest.resetModules();
    ({ app } = require('../src/server'));
    adminService = require('../src/services/adminService');
  });

  test('validateAdminCredentials returns true only for correct env credentials', () => {
    expect(adminService.validateAdminCredentials('admin@example.com', 'supersecret')).toBe(true);
    expect(adminService.validateAdminCredentials('admin@example.com', 'wrong')).toBe(false);
    expect(adminService.validateAdminCredentials('wrong@example.com', 'supersecret')).toBe(false);
  });

  test('createAdminToken returns valid JWT with ADMIN role', () => {
    const token = adminService.createAdminToken();
    expect(token).toBeDefined();
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.role).toBe('ADMIN');
    expect(decoded.id).toBe(0);
  });

  test('POST /api/admin/login returns token for valid credentials', async () => {
    const response = await request(app)
      .post('/api/admin/login')
      .send({ email: 'admin@example.com', password: 'supersecret' });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.role).toBe('ADMIN');
  });

  test('GET /api/admin/summary requires admin token', async () => {
    const login = await request(app)
      .post('/api/admin/login')
      .send({ email: 'admin@example.com', password: 'supersecret' });

    const token = login.body.token;
    const response = await request(app)
      .get('/api/admin/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('userCount');
    expect(response.body).toHaveProperty('conversationCount');
    expect(response.body).toHaveProperty('messageCount');
    expect(response.body).toHaveProperty('notificationCount');
    expect(response.body).toHaveProperty('onlineUsers');
  });
});