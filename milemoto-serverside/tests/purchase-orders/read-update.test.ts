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
const taxIds: number[] = [];

async function createTax(name: string, type: 'fixed' | 'percentage', rate: number) {
  const res = await request(app)
    .post('/api/v1/admin/taxes')
    .set('Authorization', `Bearer ${fixtures.accessToken}`)
    .send({
      name,
      rate,
      type,
      status: 'active',
    });
  expect(res.status).toBe(201);
  const id = Number(res.body.id);
  taxIds.push(id);
  return { id, ...res.body };
}

beforeAll(async () => {
  fixtures = await setupPurchaseOrderFixtures();
});

afterAll(async () => {
  if (taxIds.length) {
    await db.delete(taxes).where(eq(taxes.id, taxIds[0]!));
    for (const extraId of taxIds.slice(1)) {
      await db.delete(taxes).where(eq(taxes.id, extraId));
    }
  }
  await cleanupPurchaseOrderFixtures(fixtures);
});

describe('purchase orders read + update routes', () => {
  it('lists created purchase orders and supports search', async () => {
    const uniqueA = `PO List A ${crypto.randomUUID().slice(0, 6)}`;
    const uniqueB = `PO List B ${crypto.randomUUID().slice(0, 6)}`;
    const a = await createDraftPo(fixtures, uniqueA);
    const b = await createDraftPo(fixtures, uniqueB);

    const listRes = await request(app)
      .get('/api/v1/admin/purchase-orders')
      .query({ page: 1, limit: 20 })
      .set('Authorization', `Bearer ${fixtures.accessToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.items)).toBe(true);
    expect(listRes.body.items.some((po: { id: number }) => Number(po.id) === Number(a.body.id))).toBe(
      true,
    );
    expect(listRes.body.items.some((po: { id: number }) => Number(po.id) === Number(b.body.id))).toBe(
      true,
    );

    const searchRes = await request(app)
      .get('/api/v1/admin/purchase-orders')
      .query({ page: 1, limit: 20, search: uniqueA })
      .set('Authorization', `Bearer ${fixtures.accessToken}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.items.length).toBeGreaterThan(0);
    expect(
      searchRes.body.items.some((po: { subject: string }) => String(po.subject).includes(uniqueA)),
    ).toBe(true);
  });

  it('returns PO detail with lines and tax snapshot fields', async () => {
    const poTax = await createTax(`PO Line Tax ${crypto.randomUUID().slice(0, 6)}`, 'percentage', 10);
    const createRes = await createDraftPo(fixtures, 'PO detail tax snapshot', {
      lines: [
        {
          productVariantId: fixtures.variantId,
          orderedQty: 2,
          unitCost: 10,
          taxId: poTax.id,
        },
      ],
    });

    expect(createRes.body.lines?.[0]?.taxId).toBe(poTax.id);
    expect(createRes.body.lines?.[0]?.taxName).toBe(poTax.name);
    expect(createRes.body.lines?.[0]?.taxType).toBe('percentage');
    expect(Number(createRes.body.lines?.[0]?.taxRate)).toBe(10);

    const detailRes = await request(app)
      .get(`/api/v1/admin/purchase-orders/${createRes.body.id}`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`);

    expect(detailRes.status).toBe(200);
    expect(Array.isArray(detailRes.body.lines)).toBe(true);
    expect(detailRes.body.lines.length).toBe(1);
    expect(detailRes.body.lines[0].taxId).toBe(poTax.id);
    expect(detailRes.body.lines[0].taxName).toBe(poTax.name);
    expect(detailRes.body.lines[0].taxType).toBe('percentage');
    expect(Number(detailRes.body.lines[0].taxRate)).toBe(10);
    expect(Number(detailRes.body.lines[0].lineTax)).toBe(2);
  });

  it('updates draft PO successfully and recalculates totals and tax snapshot', async () => {
    const initialTax = await createTax(`PO Tax P ${crypto.randomUUID().slice(0, 6)}`, 'percentage', 10);
    const updatedTax = await createTax(`PO Tax F ${crypto.randomUUID().slice(0, 6)}`, 'fixed', 1.5);

    const createRes = await createDraftPo(fixtures, 'PO update recalc', {
      shippingCost: 1,
      lines: [
        {
          productVariantId: fixtures.variantId,
          orderedQty: 2,
          unitCost: 10,
          taxId: initialTax.id,
        },
      ],
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.taxTotal).toBe(2);

    const updateRes = await request(app)
      .put(`/api/v1/admin/purchase-orders/${createRes.body.id}`)
      .set('Authorization', `Bearer ${fixtures.accessToken}`)
      .send({
        subject: 'PO update recalc changed',
        shippingCost: 2,
        discountType: 'fixed',
        discountValue: 1,
        lines: [
          {
            productVariantId: fixtures.variantId,
            orderedQty: 3,
            unitCost: 12,
            taxId: updatedTax.id,
          },
        ],
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.subject).toBe('PO update recalc changed');
    expect(Number(updateRes.body.subtotal)).toBe(36);
    expect(Number(updateRes.body.discountAmount)).toBe(1);
    expect(Number(updateRes.body.taxTotal)).toBe(4.5);
    expect(Number(updateRes.body.total)).toBe(41.5);
    expect(updateRes.body.lines).toHaveLength(1);
    expect(updateRes.body.lines[0].taxId).toBe(updatedTax.id);
    expect(updateRes.body.lines[0].taxName).toBe(updatedTax.name);
    expect(updateRes.body.lines[0].taxType).toBe('fixed');
    expect(Number(updateRes.body.lines[0].taxRate)).toBe(1.5);
    expect(Number(updateRes.body.lines[0].lineTax)).toBe(4.5);
  });
});

