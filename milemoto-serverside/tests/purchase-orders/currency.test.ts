import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { currencies } from '@milemoto/types';
import {
  cleanupPurchaseOrderFixtures,
  createDraftPo,
  setupPurchaseOrderFixtures,
  type PurchaseOrderFixtures,
} from './helpers.js';

let fixtures: PurchaseOrderFixtures;
let inactiveCurrencyId: number | null = null;

beforeAll(async () => {
  fixtures = await setupPurchaseOrderFixtures();
});

afterAll(async () => {
  if (inactiveCurrencyId) {
    await db.delete(currencies).where(eq(currencies.id, inactiveCurrencyId));
  }
  await cleanupPurchaseOrderFixtures(fixtures);
});

describe('purchase orders currency validation', () => {
  it('stores the selected currency on the PO', async () => {
    const res = await createDraftPo(fixtures, 'Currency ok');
    expect(res.body.currencyId).toBe(fixtures.currencyId);
  });

  it('rejects inactive currencies', async () => {
    const suffix = crypto.randomUUID().slice(0, 3).toUpperCase();
    const inactiveRes = await request(app)
      .post('/api/v1/admin/currencies')
      .set('Authorization', `Bearer ${fixtures.accessToken}`)
      .send({
        name: `Inactive ${suffix}`,
        code: `PI${suffix}`,
        symbol: '$',
        exchangeRate: 1.0,
        status: 'inactive',
      });
    expect(inactiveRes.status).toBe(201);
    inactiveCurrencyId = Number(inactiveRes.body.id);

    const res = await request(app)
      .post('/api/v1/admin/purchase-orders')
      .set('Authorization', `Bearer ${fixtures.accessToken}`)
      .send({
        subject: 'Currency inactive',
        vendorId: fixtures.vendorId,
        stockLocationId: fixtures.stockLocationId,
        currencyId: inactiveCurrencyId,
        paymentTerms: 'Net 30',
        paymentMethodId: fixtures.paymentMethodId,
        lines: [
          {
            productVariantId: fixtures.variantId,
            orderedQty: 1,
            unitCost: 10,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body?.code).toBe('BadRequest');
  });
});
