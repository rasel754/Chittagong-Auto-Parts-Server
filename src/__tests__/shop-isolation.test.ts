import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setupTestDb, teardownTestDb, clearTestDb, createTestSeedData } from './helpers/setup.js';

describe('Multi-Shop Authorization & Data Isolation Tests', () => {
  const app = createApp();
  let adminToken: string;
  let ctgStaffToken: string;
  let dhakaStaffToken: string;
  let ctgShopId: string;
  let dhakaShopId: string;
  let inactiveShopId: string;
  let brakePadId: string;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    const seed = await createTestSeedData();
    ctgShopId = seed.shops.ctgShop._id.toString();
    dhakaShopId = seed.shops.dhakaShop._id.toString();
    inactiveShopId = seed.shops.inactiveShop._id.toString();
    brakePadId = seed.products.brakePad._id.toString();

    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      phone: '01811000000',
      password: 'Password123!'
    });
    adminToken = adminLogin.body.data.token;

    const ctgLogin = await request(app).post('/api/v1/auth/login').send({
      phone: '01811222222',
      password: 'Password123!'
    });
    ctgStaffToken = ctgLogin.body.data.token;

    const dhakaLogin = await request(app).post('/api/v1/auth/login').send({
      phone: '01711222222',
      password: 'Password123!'
    });
    dhakaStaffToken = dhakaLogin.body.data.token;
  });

  it('should allow Admin to create dynamic shops', async () => {
    const res = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Sylhet Branch',
        code: 'sylhet-branch',
        address: 'Zindabazar, Sylhet',
        phone: '01711998877'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Sylhet Branch');
    expect(res.body.data.code).toBe('sylhet-branch');
  });

  it('should prevent Staff from creating new shops', async () => {
    const res = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${ctgStaffToken}`)
      .send({
        name: 'Unauthorized Branch'
      });

    expect(res.status).toBe(403);
  });

  it('should prevent Staff from accessing or performing sales in unauthorized shops', async () => {
    // CTG Staff attempts to access Dhaka shop inventory
    const getDhakaInv = await request(app)
      .get(`/api/v1/shops/${dhakaShopId}/inventory`)
      .set('Authorization', `Bearer ${ctgStaffToken}`);

    expect(getDhakaInv.status).toBe(403);

    // Dhaka Staff attempts to record sale in CTG Shop
    const saleRes = await request(app)
      .post(`/api/v1/shops/${ctgShopId}/sales`)
      .set('Authorization', `Bearer ${dhakaStaffToken}`)
      .send({
        productId: brakePadId,
        quantitySold: 1
      });

    expect(saleRes.status).toBe(403);
  });

  it('should reject stock-in or sales on Inactive shops', async () => {
    const res = await request(app)
      .post(`/api/v1/shops/${inactiveShopId}/stock-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: brakePadId,
        supplierName: 'Supplier',
        quantityReceived: 10,
        buyingRatePerPiece: 500
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('inactive');
  });
});
