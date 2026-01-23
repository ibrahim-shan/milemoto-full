import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from '../../src/app.js';
import { signState } from '../../src/routes/helpers/auth.helpers.js';

describe('auth oauth google', () => {
  it('redirects to Google oauth with state', async () => {
    const res = await request(app).get('/api/v1/auth/google/start').query({ next: '/account' });
    expect(res.status).toBe(302);
    const location = String(res.headers.location || '');
    expect(location).toContain('accounts.google.com');
    expect(location).toContain('state=');
  });

  it('rejects callback with missing code/state', async () => {
    const res = await request(app).get('/api/v1/auth/google/callback');
    expect(res.status).toBe(302);
    const location = String(res.headers.location || '');
    expect(location).toContain('/signin');
    expect(location).toContain('error=InvalidOAuthState');
  });

  it('rejects callback with missing code even when state is valid', async () => {
    const state = signState({ next: '/account', remember: false, nonce: 'test-nonce' });
    const res = await request(app)
      .get('/api/v1/auth/google/callback')
      .query({ state });
    expect(res.status).toBe(302);
    const location = String(res.headers.location || '');
    expect(location).toContain('/signin');
    expect(location).toContain('error=InvalidOAuthState');
  });
});
