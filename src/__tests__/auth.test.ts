import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setupTestDb, teardownTestDb, clearTestDb, createTestSeedData } from './helpers/setup.js';

describe('Authentication & Authorization Integration Tests', () => {
  const app = createApp();

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    await createTestSeedData();
  });

  it('should authenticate user with valid BD phone number and password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      phone: '01811000000',
      password: 'Password123!'
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).toHaveProperty('id');
    expect(res.body.data.user.phone).toBe('01811000000');
    expect(res.body.data.user.role).toBe('ADMIN');
    // Ensure password hash is never returned
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('should normalize formatted phone numbers (e.g. +8801811000000) during login', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      phone: '+8801811000000',
      password: 'Password123!'
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      phone: '01811000000',
      password: 'WrongPassword!'
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject deactivated user account', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      phone: '01911999999',
      password: 'Password123!'
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should get current user profile with valid Bearer token', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      phone: '01811000000',
      password: 'Password123!'
    });

    const token = loginRes.body.data.token;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.phone).toBe('01811000000');
  });

  it('should reject requests with missing or invalid token on protected routes', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);

    const invalidRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid_token_123');
    expect(invalidRes.status).toBe(401);
  });
});
