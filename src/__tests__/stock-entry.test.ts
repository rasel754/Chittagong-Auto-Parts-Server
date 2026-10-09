import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setupTestDb, teardownTestDb, clearTestDb, createTestSeedData } from './helpers/setup.js';
import { InventoryModel } from '../modules/inventory/inventory.model.js';
import { StockMovementModel } from '../modules/stock-movements/stock-movement.model.js';

describe('Stock Entry & Weighted-Average Costing Tests', () => {
  const app = createApp();
  let adminToken: string;
  let ctgStaffToken: string;
  let ctgShopId: string;
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
    brakePadId = seed.products.brakePad._id.toString();

    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      phone: '01811000000',
      password: 'Password123!'
    });
    adminToken = adminLogin.body.data.token;

    const staffLogin = await request(app).post('/api/v1/auth/login').send({
      phone: '01811222222',
      password: 'Password123!'
    });
    ctgStaffToken = staffLogin.body.data.token;
  });

  it('should record first stock entry and initialize inventory with exact cost', async () => {
    const res = await request(app)
      .post(`/api/v1/shops/${ctgShopId}/stock-entries`)
      .set('Authorization', `Bearer ${ctgStaffToken}`)
      .send({
        productId: brakePadId,
        supplierName: 'Tokyo Spares Ltd.',
        quantityReceived: 50,
        buyingRatePerPiece: 1000,
        sellingRatePerPiece: 1500,
        notes: 'Initial purchase'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quantityReceived).toBe(50);
    expect(res.body.data.buyingRatePerPiece).toBe(1000);
    expect(res.body.data.totalPurchaseValue).toBe(50000); // 50 * 1000
    expect(res.body.data.supplierName).toBe('Tokyo Spares Ltd.');

    // Verify Inventory record in database
    const inventory = await InventoryModel.findOne({
      shopId: ctgShopId,
      productId: brakePadId
    });
    expect(inventory).not.toBeNull();
    expect(inventory!.quantityOnHand).toBe(50);
    expect(inventory!.averageUnitCost).toBe(1000);
    expect(inventory!.defaultSellingRatePerPiece).toBe(1500);

    // Verify StockMovement history ledger
    const movements = await StockMovementModel.find({
      shopId: ctgShopId,
      productId: brakePadId
    });
    expect(movements.length).toBe(1);
    expect(movements[0].movementType).toBe('STOCK_IN');
    expect(movements[0].quantityChange).toBe(50);
    expect(movements[0].quantityBefore).toBe(0);
    expect(movements[0].quantityAfter).toBe(50);
    expect(movements[0].referenceType).toBe('STOCK_ENTRY');
  });

  it('should accurately calculate weighted-average unit cost across multiple purchases', async () => {
    // 1st purchase: 50 pcs @ 1000 BDT
    await request(app)
      .post(`/api/v1/shops/${ctgShopId}/stock-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: brakePadId,
        supplierName: 'Supplier A',
        quantityReceived: 50,
        buyingRatePerPiece: 1000
      });

    let inv = await InventoryModel.findOne({ shopId: ctgShopId, productId: brakePadId });
    expect(inv!.quantityOnHand).toBe(50);
    expect(inv!.averageUnitCost).toBe(1000);

    // 2nd purchase: 50 pcs @ 1200 BDT
    // New avg cost = (50*1000 + 50*1200) / 100 = (50000 + 60000) / 100 = 1100 BDT
    await request(app)
      .post(`/api/v1/shops/${ctgShopId}/stock-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: brakePadId,
        supplierName: 'Supplier B',
        quantityReceived: 50,
        buyingRatePerPiece: 1200
      });

    inv = await InventoryModel.findOne({ shopId: ctgShopId, productId: brakePadId });
    expect(inv!.quantityOnHand).toBe(100);
    expect(inv!.averageUnitCost).toBe(1100);

    // 3rd purchase: 100 pcs @ 1400 BDT
    // New avg cost = (100*1100 + 100*1400) / 200 = (110000 + 140000) / 200 = 1250 BDT
    await request(app)
      .post(`/api/v1/shops/${ctgShopId}/stock-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: brakePadId,
        supplierName: 'Supplier C',
        quantityReceived: 100,
        buyingRatePerPiece: 1400
      });

    inv = await InventoryModel.findOne({ shopId: ctgShopId, productId: brakePadId });
    expect(inv!.quantityOnHand).toBe(200);
    expect(inv!.averageUnitCost).toBe(1250);
  });

  it('should reject invalid non-positive quantities and negative prices', async () => {
    // Quantity 0
    const zeroQtyRes = await request(app)
      .post(`/api/v1/shops/${ctgShopId}/stock-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: brakePadId,
        supplierName: 'Supplier A',
        quantityReceived: 0,
        buyingRatePerPiece: 500
      });
    expect(zeroQtyRes.status).toBe(400);

    // Negative buying rate
    const negRateRes = await request(app)
      .post(`/api/v1/shops/${ctgShopId}/stock-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: brakePadId,
        supplierName: 'Supplier A',
        quantityReceived: 10,
        buyingRatePerPiece: -500
      });
    expect(negRateRes.status).toBe(400);
  });
});
