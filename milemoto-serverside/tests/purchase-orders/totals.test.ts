import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { taxes } from '@milemoto/types';
import {
  cleanupPurchaseOrderFixtures,
  createDraftPo,
  setupPurchaseOrderFixtures,
  type PurchaseOrderFixtures,
} from './helpers.js';

let fixtures: PurchaseOrderFixtures;
let taxId: number | null = null;

beforeAll(async () => {
  fixtures = await setupPurchaseOrderFixtures();

  const taxRes = await request(app)
    .post('/api/v1/admin/taxes')
    .set('Authorization', `Bearer ${fixtures.accessToken}`)
    .send({
      name: `PO Tax ${crypto.randomUUID().slice(0, 6)}`,
      rate: 10,
      type: 'percentage',
      status: 'active',
    });
  expect(taxRes.status).toBe(201);
  taxId = Number(taxRes.body.id);
});

afterAll(async () => {
  if (taxId) {
    await db.delete(taxes).where(eq(taxes.id, taxId));
  }
  await cleanupPurchaseOrderFixtures(fixtures);
});

describe('purchase orders totals', () => {
  it('computes totals with discount and shipping', async () => {
    const res = await createDraftPo(fixtures, 'Totals fixed', {
      discountType: 'fixed',
      discountValue: 3,
      shippingCost: 5,
    });

    expect(res.body.subtotal).toBe(20);
    expect(res.body.discountAmount).toBe(3);
    expect(res.body.taxTotal).toBe(0);
    expect(res.body.total).toBe(22);
  });

  it('computes tax totals when line tax is applied', async () => {
    const res = await createDraftPo(fixtures, 'Totals tax', {
      shippingCost: 5,
      lines: [
        {
          productVariantId: fixtures.variantId,
          orderedQty: 2,
          unitCost: 10,
          ...(taxId ? { taxId } : {}),
        },
      ],
    });

    expect(res.body.subtotal).toBe(20);
    expect(res.body.taxTotal).toBe(2);
    expect(res.body.total).toBe(27);
  });
});
