import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setupTestDb, teardownTestDb, clearTestDb, createTestSeedData } from './helpers/setup.js';

describe('Dashboard Aggregations & Reporting Tests', () => {
  const app = createApp();
  let adminToken: string;
  let ctgStaffToken: string;
  let ctgShopId: string;
  let dhakaShopId: string;
  let brakePadId: string;
  let sparkPlugId: string;

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
    brakePadId = seed.products.brakePad._id.toString();
    sparkPlugId = seed.products.sparkPlug._id.toString();

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

    // CTG Shop: 20 brake pads @ 1000 BDT (Valuation = 20,000 BDT)
    await request(app)
      .post(`/api/v1/shops/${ctgShopId}/stock-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: brakePadId,
        supplierName: 'Supplier 1',
        quantityReceived: 20,
        buyingRatePerPiece: 1000,
        sellingRatePerPiece: 1500
      });

    // CTG Shop: 30 spark plugs @ 400 BDT (Valuation = 12,000 BDT)
    await request(app)
      .post(`/api/v1/shops/${ctgShopId}/stock-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: sparkPlugId,
        supplierName: 'Supplier 2',
        quantityReceived: 30,
        buyingRatePerPiece: 400,
        sellingRatePerPiece: 600
      });

    // Dhaka Shop: 10 brake pads @ 1200 BDT (Valuation = 12,000 BDT)
    // Note: Same brake pad product in another shop
    await request(app)
      .post(`/api/v1/shops/${dhakaShopId}/stock-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: brakePadId,
        supplierName: 'Supplier 3',
        quantityReceived: 10,
        buyingRatePerPiece: 1200,
        sellingRatePerPiece: 1600
      });

    // CTG Sale: 5 brake pads @ 1500 BDT (Rev: 7500, COGS: 5000, Profit: 2500)
    await request(app)
      .post(`/api/v1/shops/${ctgShopId}/sales`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: brakePadId,
        quantitySold: 5
      });

    // Dhaka Sale: 2 brake pads @ 1600 BDT (Rev: 3200, COGS: 2400, Profit: 800)
    await request(app)
      .post(`/api/v1/shops/${dhakaShopId}/sales`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: brakePadId,
        quantitySold: 2
      });
  });

  it('should calculate global dashboard overview metrics across authorized shops', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const metrics = res.body.data.metrics;

    // Total distinct products across business = 2 (Brake pads and Spark plugs)
    // NOT 3 (since Brake pads exist in both CTG and Dhaka shops)
    expect(metrics.totalDistinctProducts).toBe(2);

    // Remaining stock units:
    // CTG: (20 - 5) + 30 = 45 units
    // Dhaka: (10 - 2) = 8 units
    // Total stock units = 53
    expect(metrics.totalStockUnits).toBe(53);

    // Sales Revenue: CTG (7500) + Dhaka (3200) = 10700 BDT
    expect(metrics.totalSalesRevenue).toBe(10700);

    // Gross Profit: CTG (2500) + Dhaka (800) = 3300 BDT
    expect(metrics.totalGrossProfit).toBe(3300);

    // Per-shop breakdown verification
    expect(res.body.data.shopBreakdown.length).toBeGreaterThanOrEqual(2);
  });

  it('should restrict overview metrics to only permitted shops for restricted staff', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/overview')
      .set('Authorization', `Bearer ${ctgStaffToken}`);

    expect(res.status).toBe(200);
    const metrics = res.body.data.metrics;

    // CTG Staff only sees CTG Shop data
    expect(metrics.totalSalesRevenue).toBe(7500);
    expect(metrics.totalGrossProfit).toBe(2500);
    expect(metrics.totalStockUnits).toBe(45);
  });

  it('should calculate individual shop dashboard correctly', async () => {
    const res = await request(app)
      .get(`/api/v1/shops/${ctgShopId}/dashboard`)
      .set('Authorization', `Bearer ${ctgStaffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics.distinctProductCount).toBe(2);
    expect(res.body.data.metrics.totalQuantityOnHand).toBe(45);
    expect(res.body.data.metrics.salesRevenue).toBe(7500);
    expect(res.body.data.metrics.grossProfit).toBe(2500);
  });
});
