import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setupTestDb, teardownTestDb, clearTestDb, createTestSeedData } from './helpers/setup.js';
import { ProductModel } from '../modules/products/product.model.js';

describe('Product Name Search Tests across Stock, Sales, Movements, and Products', () => {
  const app = createApp();
  let adminToken: string;
  let ctgShopId: string;
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
    brakePadId = seed.products.brakePad._id.toString();
    sparkPlugId = seed.products.sparkPlug._id.toString();

    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      phone: '01811000000',
      password: 'Password123!'
    });
    adminToken = adminLogin.body.data.token;

    // Create stock entry for brake pad
    await request(app)
      .post(`/api/v1/shops/${ctgShopId}/stock-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: brakePadId,
        supplierName: 'Unique Supplier Alpha',
        quantityReceived: 30,
        buyingRatePerPiece: 1000,
        sellingRatePerPiece: 1500
      });

    // Create stock entry for spark plug
    await request(app)
      .post(`/api/v1/shops/${ctgShopId}/stock-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: sparkPlugId,
        supplierName: 'Unique Supplier Beta',
        quantityReceived: 50,
        buyingRatePerPiece: 200,
        sellingRatePerPiece: 350
      });

    // Create a sale for brake pad
    await request(app)
      .post(`/api/v1/shops/${ctgShopId}/sales`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: brakePadId,
        quantitySold: 2,
        sellingRatePerPiece: 1500,
        notes: 'Invoice 101 | Customer: Karim'
      });
  });

  it('should find stock entries when searching by product name', async () => {
    // Search "Brake Pads"
    const res = await request(app)
      .get(`/api/v1/shops/${ctgShopId}/stock-entries?search=Brake Pads`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].productId.name).toBe('Ceramic Brake Pads');

    // Search by partial/lowercase
    const partialRes = await request(app)
      .get(`/api/v1/shops/${ctgShopId}/stock-entries?search=ceramic`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(partialRes.status).toBe(200);
    expect(partialRes.body.data.length).toBe(1);
  });

  it('should find sales when searching by product name', async () => {
    const res = await request(app)
      .get(`/api/v1/shops/${ctgShopId}/sales?search=Brake Pads`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].productId.name).toBe('Ceramic Brake Pads');

    // Searching for spark plug should return 0 sales
    const emptyRes = await request(app)
      .get(`/api/v1/shops/${ctgShopId}/sales?search=Spark Plug`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(emptyRes.status).toBe(200);
    expect(emptyRes.body.data.length).toBe(0);
  });

  it('should find stock movements when searching by product name', async () => {
    const res = await request(app)
      .get(`/api/v1/shops/${ctgShopId}/stock-movements?search=Spark Plug`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].productId.name).toBe('Iridium Spark Plug');
  });

  it('should handle product names with special regex characters safely without crashing', async () => {
    // Create product with parentheses and brackets
    const createdProduct = await ProductModel.create({
      name: 'Oil Filter (High-Performance) [Premium]',
      normalizedName: 'oil filter (high-performance) [premium]',
      sku: 'OF-HP(01)'
    });

    await request(app)
      .post(`/api/v1/shops/${ctgShopId}/stock-entries`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: createdProduct._id.toString(),
        supplierName: 'Special Supplier',
        quantityReceived: 10,
        buyingRatePerPiece: 500,
        sellingRatePerPiece: 750
      });

    // Search with regex characters: '(' and '['
    const searchTerm = encodeURIComponent('(High-Performance) [Premium]');
    const res = await request(app)
      .get(`/api/v1/shops/${ctgShopId}/stock-entries?search=${searchTerm}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].productId.name).toContain('(High-Performance) [Premium]');

    // Direct product endpoint search
    const prodRes = await request(app)
      .get(`/api/v1/products?search=${encodeURIComponent('(High-Performance)')}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(prodRes.status).toBe(200);
    expect(prodRes.body.data.length).toBe(1);
  });
});
