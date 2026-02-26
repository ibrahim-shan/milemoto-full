import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { stocklevels, stockmovements } from '@milemoto/types';
import {
  cleanupPurchaseOrderFixtures,
  createDraftPo,
  setupPurchaseOrderFixtures,
  submitAndApprovePurchaseOrder,
  type PurchaseOrderFixtures,
} from '../purchase-orders/helpers.js';

describe.sequential('goods receipts', () => {
  let fixtures: PurchaseOrderFixtures;
  let accessToken = '';
  let poId = 0;
  let poLineId = 0;
  let grnId = 0;

  beforeAll(async () => {
    fixtures = await setupPurchaseOrderFixtures([
      {
        slug: 'goods_receipts.read',
        description: 'View goods receipts',
        resourceGroup: 'Purchasing',
      },
      {
        slug: 'goods_receipts.manage',
        description: 'Manage goods receipts',
        resourceGroup: 'Purchasing',
      },
      { slug: 'stock.read', description: 'View stock', resourceGroup: 'Stock' },
      { slug: 'stock_movements.read', description: 'View stock movements', resourceGroup: 'Stock' },
    ]);
    accessToken = fixtures.accessToken;
  });

  afterAll(async () => {
    if (fixtures?.variantId) {
      await db
        .delete(stockmovements)
        .where(eq(stockmovements.productVariantId, fixtures.variantId));
      await db.delete(stocklevels).where(eq(stocklevels.productVariantId, fixtures.variantId));
    }
    if (fixtures) {
      await cleanupPurchaseOrderFixtures(fixtures);
    }
  });

  it('creates a draft goods receipt and validates remaining qty', async () => {
    const poRes = await createDraftPo(fixtures, 'GRN Draft PO', {
      lines: [{ productVariantId: fixtures.variantId, orderedQty: 5, unitCost: 12 }],
    });
    poId = Number(poRes.body.id);
    await submitAndApprovePurchaseOrder(accessToken, poId);

    const poDetailRes = await request(app)
      .get(`/api/v1/admin/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    poLineId = Number(poDetailRes.body?.lines?.[0]?.id);
    expect(poLineId).toBeTruthy();

    const grnRes = await request(app)
      .post('/api/v1/admin/goods-receipts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        purchaseOrderId: poId,
        note: 'Initial receipt',
        lines: [
          {
            purchaseOrderLineId: poLineId,
            receivedQty: 2,
            rejectedQty: 0,
          },
        ],
      });

    expect(grnRes.status).toBe(201);
    expect(grnRes.body?.status).toBe('draft');
    grnId = Number(grnRes.body.id);
    expect(grnId).toBeTruthy();

    const invalidRes = await request(app)
      .post('/api/v1/admin/goods-receipts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        purchaseOrderId: poId,
        lines: [
          {
            purchaseOrderLineId: poLineId,
            receivedQty: 6,
            rejectedQty: 0,
          },
        ],
      });

    expect(invalidRes.status).toBe(400);
  });

  it('lists goods receipts', async () => {
    const res = await request(app)
      .get('/api/v1/admin/goods-receipts')
      .query({ limit: 50 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    const ids = (res.body.items ?? []).map((g: { id: number }) => g.id);
    expect(ids).toContain(grnId);
  });

  it('gets a goods receipt by id', async () => {
    if (!grnId) throw new Error('Missing GRN id');
    const res = await request(app)
      .get(`/api/v1/admin/goods-receipts/${grnId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Number(res.body?.id)).toBe(grnId);
    expect(res.body?.status).toBe('draft');
  });

  it('updates a draft goods receipt (change note)', async () => {
    if (!grnId || !poLineId) throw new Error('Missing GRN or PO line id');
    const res = await request(app)
      .put(`/api/v1/admin/goods-receipts/${grnId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        purchaseOrderId: poId,
        note: 'Updated note',
        lines: [
          {
            purchaseOrderLineId: poLineId,
            receivedQty: 2,
            rejectedQty: 0,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body?.note).toBe('Updated note');
  });

  it('posts a goods receipt and updates PO status + inventory', async () => {
    const postRes = await request(app)
      .post(`/api/v1/admin/goods-receipts/${grnId}/post`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(postRes.status).toBe(200);
    expect(postRes.body?.status).toBe('posted');

    const poAfterRes = await request(app)
      .get(`/api/v1/admin/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(poAfterRes.status).toBe(200);
    expect(poAfterRes.body?.status).toBe('partially_received');

    const [level] = await db
      .select()
      .from(stocklevels)
      .where(eq(stocklevels.productVariantId, fixtures.variantId))
      .limit(1);
    expect(Number(level?.onHand ?? 0)).toBe(2);

    const [movement] = await db
      .select()
      .from(stockmovements)
      .where(eq(stockmovements.productVariantId, fixtures.variantId))
      .limit(1);
    expect(Number(movement?.quantity ?? 0)).toBe(2);
    expect(String(movement?.type)).toBe('purchase_receipt');

    const grnRes = await request(app)
      .post('/api/v1/admin/goods-receipts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        purchaseOrderId: poId,
        note: 'Final receipt',
        lines: [
          {
            purchaseOrderLineId: poLineId,
            receivedQty: 3,
            rejectedQty: 0,
          },
        ],
      });
    expect(grnRes.status).toBe(201);

    const postRes2 = await request(app)
      .post(`/api/v1/admin/goods-receipts/${grnRes.body.id}/post`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(postRes2.status).toBe(200);

    const poFinalRes = await request(app)
      .get(`/api/v1/admin/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(poFinalRes.body?.status).toBe('fully_received');

    const [finalLevel] = await db
      .select()
      .from(stocklevels)
      .where(eq(stocklevels.productVariantId, fixtures.variantId))
      .limit(1);
    expect(Number(finalLevel?.onHand ?? 0)).toBe(5);
  });
});
