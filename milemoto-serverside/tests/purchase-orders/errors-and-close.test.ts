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

describe('purchase orders close + error cases', () => {
  it('closes an approved purchase order successfully', async () => {
    const res = await createDraftPo(fixtures, 'Close success');

    const submitRes = await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/submit`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);
    expect(submitRes.status).toBe(200);

    const approveRes = await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/approve`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);
    expect(approveRes.status).toBe(200);

    const closeRes = await request(app)
      .post(`/api/v1/admin/purchase-orders/${res.body.id}/close`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.status).toBe('closed');
  });

  it('returns 404 for missing PO detail', async () => {
    const res = await request(app)
      .get('/api/v1/admin/purchase-orders/99999999')
      .set('Authorization', `Bearer ${fixtures.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body?.code).toBe('NotFound');
  });

  it('returns 404 for missing PO update', async () => {
    const res = await request(app)
      .put('/api/v1/admin/purchase-orders/99999999')
      .set('Authorization', `Bearer ${fixtures.accessToken}`)
      .send({ subject: 'Nope' });

    expect(res.status).toBe(404);
    expect(res.body?.code).toBe('NotFound');
  });

  it('returns validation error for invalid create payload', async () => {
    const res = await request(app)
      .post('/api/v1/admin/purchase-orders')
      .set('Authorization', `Bearer ${fixtures.accessToken}`)
      .send({
        subject: '',
        vendorId: fixtures.vendorId,
        stockLocationId: fixtures.stockLocationId,
        currencyId: fixtures.currencyId,
        paymentTerms: 'Net 30',
        paymentMethodId: fixtures.paymentMethodId,
        lines: [],
      });

    expect(res.status).toBe(400);
    expect(res.body?.code).toBe('ValidationError');
  });
});

