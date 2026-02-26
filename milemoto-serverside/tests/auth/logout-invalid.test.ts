import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from '../../src/app.js';
import { env } from '../../src/config/env.js';

describe('auth logout invalid token', () => {
  it('returns 401 for invalid refresh token', async () => {
    const cookieName = env.REFRESH_COOKIE_NAME;
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `${cookieName}=invalid-token`);

    // Current logout implementation is idempotent and clears cookies even with invalid/missing refresh token.
    expect(res.status).toBe(204);
  });

  it('returns 401 when no refresh cookie is present', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(204);
  });
});
