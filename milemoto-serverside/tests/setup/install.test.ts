import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from '../../src/app.js';

describe('setup/install flow', () => {
  it('rejects invalid initialize payloads', async () => {
    const badEmail = await request(app).post('/api/v1/setup/initialize').send({
      fullName: 'Setup Admin',
      email: 'not-an-email',
      password: 'Password123!',
    });
    expect(badEmail.status).toBe(400);
    expect(badEmail.body?.code).toBe('ValidationError');

    const badPassword = await request(app).post('/api/v1/setup/initialize').send({
      fullName: 'Setup Admin',
      email: `setup-admin-${Date.now()}@milemoto.local`,
      password: 'short',
    });
    expect(badPassword.status).toBe(400);
    expect(badPassword.body?.code).toBe('ValidationError');

    const missingName = await request(app).post('/api/v1/setup/initialize').send({
      fullName: '',
      email: `setup-admin-${Date.now()}@milemoto.local`,
      password: 'Password123!',
    });
    expect(missingName.status).toBe(400);
    expect(missingName.body?.code).toBe('ValidationError');
  });

  it('returns setup status', async () => {
    const res = await request(app).get('/api/v1/setup/status');
    expect(res.status).toBe(200);
    expect(typeof res.body?.installed).toBe('boolean');
  });

  it('initializes if not installed, or blocks when already installed', async () => {
    const statusRes = await request(app).get('/api/v1/setup/status');
    expect(statusRes.status).toBe(200);

    const installed = Boolean(statusRes.body?.installed);
    const initRes = await request(app).post('/api/v1/setup/initialize').send({
      fullName: 'Setup Admin',
      email: `setup-admin-${Date.now()}@milemoto.local`,
      password: 'Password123!',
    });

    if (installed) {
      expect(initRes.status).toBe(409);
      expect(initRes.body?.code).toBe('AlreadyInstalled');
    } else {
      expect(initRes.status).toBe(200);
      expect(initRes.body?.ok).toBe(true);

      const after = await request(app).get('/api/v1/setup/status');
      expect(after.status).toBe(200);
      expect(after.body?.installed).toBe(true);
    }

    const secondRes = await request(app).post('/api/v1/setup/initialize').send({
      fullName: 'Setup Admin',
      email: `setup-admin-${Date.now()}@milemoto.local`,
      password: 'Password123!',
    });
    expect(secondRes.status).toBe(409);
    expect(secondRes.body?.code).toBe('AlreadyInstalled');
  });
});
