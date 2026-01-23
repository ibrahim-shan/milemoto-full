import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import {
  cleanupPurchaseOrderFixtures,
  createDraftPo,
  setupPurchaseOrderFixtures,
  type PurchaseOrderFixtures,
} from './helpers.js';

let fixtures: PurchaseOrderFixtures;

beforeAll(async () => {
  fixtures = await setupPurchaseOrderFixtures();
});

afterAll(async () => {
  await cleanupPurchaseOrderFixtures(fixtures);
});

describe('purchase orders status flow', () => {
  it('starts in draft and submits for approval', async () => {
    const res = await createDraftPo(fixtures, 'Flow submit');
    expect(res.body.status).toBe('draft');

    const submitRes = await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/submit`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.status).toBe('pending_approval');
  });

  it('approves after pending approval', async () => {
    const res = await createDraftPo(fixtures, 'Flow approve');
    const submitRes = await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/submit`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);
    expect(submitRes.status).toBe(200);

    const approveRes = await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/approve`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('approved');
  });

  it('rejects a pending approval purchase order', async () => {
    const res = await createDraftPo(fixtures, 'Flow reject');
    const submitRes = await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/submit`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);
    expect(submitRes.status).toBe(200);

    const rejectRes = await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/reject`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe('cancelled');
  });

  it('cancels an approved purchase order', async () => {
    const res = await createDraftPo(fixtures, 'Flow cancel');
    await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/submit`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);

    const approveRes = await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/approve`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);
    expect(approveRes.status).toBe(200);

    const cancelRes = await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/cancel`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe('cancelled');
  });

  it('blocks submit on non-draft', async () => {
    const res = await createDraftPo(fixtures, 'Guard submit');
    await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/submit`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);

    const submitRes = await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/submit`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);

    expect(submitRes.status).toBe(400);
    expect(submitRes.body?.code).toBe('BadRequest');
  });

  it('blocks update after approval', async () => {
    const res = await createDraftPo(fixtures, 'Guard update');
    await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/submit`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);
    await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/approve`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);

    const updateRes = await request(app)
      .put(`/api/v1/admin/purchase-orders/${res.body.id}`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`)
      .send({ subject: 'Updated' });

    expect(updateRes.status).toBe(400);
    expect(updateRes.body?.code).toBe('BadRequest');
  });

  it('blocks close unless approved or partially received', async () => {
    const res = await createDraftPo(fixtures, 'Guard close');
    const closeRes = await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/close`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);

    expect(closeRes.status).toBe(400);
    expect(closeRes.body?.code).toBe('BadRequest');
  });
});
