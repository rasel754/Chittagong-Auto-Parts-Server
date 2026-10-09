import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setupTestDb, teardownTestDb, clearTestDb, createTestSeedData } from './helpers/setup.js';
import { InventoryModel } from '../modules/inventory/inventory.model.js';
import { SaleModel } from '../modules/sales/sale.model.js';
import { StockMovementModel } from '../modules/stock-movements/stock-movement.model.js';

describe('Sales Recording & Financial Accuracy Tests', () => {
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

    // Stock in 20 pcs @ 1000 BDT unit cost, default selling rate 1500 BDT
    await request(app)
      .post(`/api/v1/shops/${ctgShopId}/stock-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: brakePadId,
        supplierName: 'Japan Parts Co.',
        quantityReceived: 20,
        buyingRatePerPiece: 1000,
        sellingRatePerPiece: 1500
      });
  });

  it('should record sale with accurate financials, inventory deduction, and movement record', async () => {
    // Sell 5 pieces @ default rate 1500 BDT
    const saleRes = await request(app)
      .post(`/api/v1/shops/${ctgShopId}/sales`)
      .set('Authorization', `Bearer ${ctgStaffToken}`)
      .send({
        productId: brakePadId,
        quantitySold: 5
      });

    expect(saleRes.status).toBe(201);
    expect(saleRes.body.success).toBe(true);

    const sale = saleRes.body.data;
    expect(sale.quantitySold).toBe(5);
    expect(sale.sellingRatePerPiece).toBe(1500);
    expect(sale.totalSellingPrice).toBe(7500); // 5 * 1500
    expect(sale.unitCostAtSale).toBe(1000);
    expect(sale.costOfGoodsSold).toBe(5000); // 5 * 1000
    expect(sale.grossProfit).toBe(2500); // 7500 - 5000

    // Inventory should be 20 - 5 = 15 pcs
    const inv = await InventoryModel.findOne({ shopId: ctgShopId, productId: brakePadId });
    expect(inv!.quantityOnHand).toBe(15);
    expect(inv!.averageUnitCost).toBe(1000);

    // StockMovement ledger should have a SALE entry
    const movements = await StockMovementModel.find({
      shopId: ctgShopId,
      productId: brakePadId,
      movementType: 'SALE'
    });
    expect(movements.length).toBe(1);
    expect(movements[0].quantityChange).toBe(-5);
    expect(movements[0].quantityBefore).toBe(20);
    expect(movements[0].quantityAfter).toBe(15);
  });

  it('should support manual price override per sale', async () => {
    // Sell 2 pieces with custom selling rate of 1600 BDT
    const saleRes = await request(app)
      .post(`/api/v1/shops/${ctgShopId}/sales`)
      .set('Authorization', `Bearer ${ctgStaffToken}`)
      .send({
        productId: brakePadId,
        quantitySold: 2,
        sellingRatePerPiece: 1600,
        notes: 'VIP customer price'
      });

    expect(saleRes.status).toBe(201);
    expect(saleRes.body.data.sellingRatePerPiece).toBe(1600);
    expect(saleRes.body.data.totalSellingPrice).toBe(3200); // 2 * 1600
    expect(saleRes.body.data.costOfGoodsSold).toBe(2000); // 2 * 1000
    expect(saleRes.body.data.grossProfit).toBe(1200); // 3200 - 2000
  });

  it('should reject sale when quantity exceeds available stock', async () => {
    // Current stock is 20 pcs, try to sell 25 pcs
    const res = await request(app)
      .post(`/api/v1/shops/${ctgShopId}/sales`)
      .set('Authorization', `Bearer ${ctgStaffToken}`)
      .send({
        productId: brakePadId,
        quantitySold: 25
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('should freeze captured unitCostAtSale in past sales when new stock arrives at different cost', async () => {
    // 1. Record Sale 1 (5 pcs @ 1500 BDT, cost basis 1000 BDT)
    const sale1Res = await request(app)
      .post(`/api/v1/shops/${ctgShopId}/sales`)
      .set('Authorization', `Bearer ${ctgStaffToken}`)
      .send({
        productId: brakePadId,
        quantitySold: 5
      });
    const sale1Id = sale1Res.body.data.id;

    // Remaining stock: 15 pcs @ 1000 BDT

    // 2. Buy 15 more pcs @ 1600 BDT (New avg cost: (15*1000 + 15*1600)/30 = 1300 BDT)
    await request(app)
      .post(`/api/v1/shops/${ctgShopId}/stock-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: brakePadId,
        supplierName: 'New Supplier',
        quantityReceived: 15,
        buyingRatePerPiece: 1600
      });

    const inv = await InventoryModel.findOne({ shopId: ctgShopId, productId: brakePadId });
    expect(inv!.quantityOnHand).toBe(30);
    expect(inv!.averageUnitCost).toBe(1300);

    // 3. Verify Sale 1 in database still has original unitCostAtSale = 1000 and profit = 2500
    const historicalSale = await SaleModel.findById(sale1Id);
    expect(historicalSale!.unitCostAtSale).toBe(1000);
    expect(historicalSale!.costOfGoodsSold).toBe(5000);
    expect(historicalSale!.grossProfit).toBe(2500);

    // 4. Record Sale 2 (5 pcs @ 1800 BDT, new cost basis 1300 BDT)
    const sale2Res = await request(app)
      .post(`/api/v1/shops/${ctgShopId}/sales`)
      .set('Authorization', `Bearer ${ctgStaffToken}`)
      .send({
        productId: brakePadId,
        quantitySold: 5,
        sellingRatePerPiece: 1800
      });

    expect(sale2Res.body.data.unitCostAtSale).toBe(1300);
    expect(sale2Res.body.data.costOfGoodsSold).toBe(6500); // 5 * 1300
    expect(sale2Res.body.data.grossProfit).toBe(2500); // 9000 - 6500 = 2500
  });
});
