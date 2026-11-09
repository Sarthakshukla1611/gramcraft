const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/User');

describe('Authentication & Scope Test Suite', () => {
  let mockPasswordHash;

  beforeAll(async () => {
    const salt = await bcrypt.genSalt(10);
    mockPasswordHash = await bcrypt.hash('GramCraft@2026', salt);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('GET /health returns 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('api-gateway');
  });

  it('POST /api/auth/login succeeds with valid credentials', async () => {
    const mockUser = {
      _id: '65f1234567890123456789ab',
      name: 'Admin Test',
      email: 'admin@test.gov.in',
      passwordHash: mockPasswordHash,
      role: 'admin',
      scope: { district: null, block: null, villageIds: [] },
      language: 'en',
    };

    jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.gov.in', password: 'GramCraft@2026' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('admin');
  });

  it('POST /api/auth/login rejects wrong password', async () => {
    const mockUser = {
      _id: '65f1234567890123456789ab',
      name: 'Admin Test',
      email: 'admin@test.gov.in',
      passwordHash: mockPasswordHash,
      role: 'admin',
      scope: { district: null, block: null, villageIds: [] },
    };

    jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.gov.in', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/me returns current user profile', async () => {
    const mockUser = {
      _id: '65f1234567890123456789ac',
      name: 'Officer Test',
      email: 'officer@test.gov.in',
      passwordHash: mockPasswordHash,
      role: 'village_officer',
      scope: { district: 'Sehore', block: 'Ichhawar', villageIds: ['65f123456789012345678911'] },
      language: 'en',
    };

    jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'officer@test.gov.in', password: 'GramCraft@2026' });

    const token = loginRes.body.data.token;

    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('officer@test.gov.in');
    expect(meRes.body.data.user.role).toBe('village_officer');
  });
});
