import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from '../../src/app.js';
import { env } from '../../src/config/env.js';

describe('auth rate limits', () => {
  it('enforces login rate limit by identifier', async () => {
    const limit = Number(env.RATE_LOGIN_EMAIL_MAX);
    const identifier = `ratelimit-${Date.now()}@milemoto.local`;

    for (let i = 0; i < limit; i += 1) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', `10.0.0.${i + 1}`)
        .send({
          identifier,
          password: 'wrong-password',
          remember: false,
        });
      expect(res.status).not.toBe(429);
    }

    const blockedRes = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '10.0.1.1')
      .send({
        identifier,
        password: 'wrong-password',
        remember: false,
      });

    expect(blockedRes.status).toBe(429);
  });
});
