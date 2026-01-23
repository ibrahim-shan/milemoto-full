import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from '../../src/app.js';
import { env } from '../../src/config/env.js';

describe('auth refresh failures', () => {
  it('rejects refresh without cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('rejects refresh with invalid cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${env.REFRESH_COOKIE_NAME}=invalid.token.value`);
    expect(res.status).toBe(401);
  });
});
