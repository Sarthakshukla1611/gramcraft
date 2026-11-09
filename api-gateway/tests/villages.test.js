const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Village = require('../src/models/Village');
const SystemSetting = require('../src/models/SystemSetting');
const AuditLog = require('../src/models/AuditLog');
const Achievement = require('../src/models/Achievement');
const Mission = require('../src/models/Mission');
const { generateAccessToken } = require('../src/utils/token');

describe('Villages & Scope Security Suite', () => {
  const village1Id = '65f123456789012345678901';
  const village2Id = '65f123456789012345678902';

  const mockVillage1 = {
    _id: village1Id,
    name: 'Village Alpha',
    code: 'MP-TEST-01',
    district: 'Sehore',
    block: 'Ichhawar',
    population: 2000,
    households: 400,
    location: { type: 'Point', coordinates: [77.01, 22.98] },
    sectors: {
      sanitation: { score: 50 },
      water: { score: 50 },
      education: { score: 50 },
      roads: { score: 50 },
      electricity: { score: 50 },
      healthcare: { score: 50 },
    },
    overallScore: 50,
    level: 'Growing',
    xp: 100,
    save: jest.fn().mockResolvedValue(true),
  };

  const mockVillage2 = {
    _id: village2Id,
    name: 'Village Beta',
    code: 'MP-TEST-02',
    district: 'Sehore',
    block: 'Ashta',
    population: 1500,
    households: 300,
    location: { type: 'Point', coordinates: [76.82, 23.01] },
    sectors: {
      sanitation: { score: 60 },
      water: { score: 60 },
      education: { score: 60 },
      roads: { score: 60 },
      electricity: { score: 60 },
      healthcare: { score: 60 },
    },
    overallScore: 60,
    level: 'Growing',
    xp: 150,
    save: jest.fn().mockResolvedValue(true),
  };

  const adminUser = {
    _id: '65f1234567890123456789aa',
    name: 'Admin User',
    email: 'admin@test.gov.in',
    role: 'admin',
    scope: { district: null, block: null, villageIds: [] },
  };

  const officerAlpha = {
    _id: '65f1234567890123456789bb',
    name: 'Officer Alpha',
    email: 'officer_alpha@test.gov.in',
    role: 'village_officer',
    scope: { district: 'Sehore', block: 'Ichhawar', villageIds: [village1Id] },
  };

  const adminToken = generateAccessToken(adminUser);
  const officerToken = generateAccessToken(officerAlpha);

  beforeEach(() => {
    jest.spyOn(SystemSetting, 'findOne').mockResolvedValue({
      gamificationValues: { approvalJumpThreshold: 10 },
      weights: {},
    });
    jest.spyOn(AuditLog, 'create').mockResolvedValue({});
    jest.spyOn(Achievement, 'find').mockResolvedValue([]);
    jest.spyOn(Mission, 'find').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('GET /api/villages returns villages list', async () => {
    jest.spyOn(Village, 'find').mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockVillage1, mockVillage2]),
        }),
      }),
    });
    jest.spyOn(Village, 'countDocuments').mockResolvedValue(2);

    const res = await request(app).get('/api/villages');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
  });

  it('GET /api/villages/:id retrieves single village', async () => {
    jest.spyOn(Village, 'findById').mockResolvedValue(mockVillage1);

    const res = await request(app).get(`/api/villages/${village1Id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Village Alpha');
  });

  it('Village Officer CAN edit their assigned village', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(officerAlpha),
    });
    jest.spyOn(Village, 'findById').mockResolvedValue(mockVillage1);

    const res = await request(app)
      .put(`/api/villages/${village1Id}`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ population: 2100 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Village Officer CANNOT edit an unassigned village (Scope rule 403 Forbidden)', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(officerAlpha),
    });
    jest.spyOn(Village, 'findById').mockResolvedValue(mockVillage2);

    const res = await request(app)
      .put(`/api/villages/${village2Id}`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ population: 1600 });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Forbidden/);
  });

  it('Admin CAN edit any village', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(adminUser),
    });
    jest.spyOn(Village, 'findById').mockResolvedValue(mockVillage2);

    const res = await request(app)
      .put(`/api/villages/${village2Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ population: 1600 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
