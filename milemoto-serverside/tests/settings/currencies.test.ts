import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import {
  brands,
  categories,
  grades,
  paymentmethods,
  productvariants,
  products,
  purchaseorderlines,
  purchaseorders,
  currencies,
  stocklocations,
  vendors,
} from '@milemoto/types';
import { createCatalogAdmin, cleanupCatalogAuth } from '../catalog/helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

let currencyId: number | null = null;
let inUseCurrencyId: number | null = null;
let vendorId: number | null = null;
let paymentMethodId: number | null = null;
let stockLocationId: number | null = null;
let brandId: number | null = null;
let rootCategoryId: number | null = null;
let subCategoryId: number | null = null;
let gradeId: number | null = null;
let productId: number | null = null;
let variantId: number | null = null;
let purchaseOrderId: number | null = null;

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'settings.read', description: 'View settings', resourceGroup: 'Settings' },
    { slug: 'settings.manage', description: 'Manage settings', resourceGroup: 'Settings' },
    { slug: 'vendors.manage', description: 'Manage vendors', resourceGroup: 'Purchasing' },
    { slug: 'payment_methods.manage', description: 'Manage payment methods', resourceGroup: 'Settings' },
    { slug: 'locations.manage', description: 'Manage locations', resourceGroup: 'Settings' },
    { slug: 'brands.manage', description: 'Manage brands', resourceGroup: 'Catalog' },
    { slug: 'categories.manage', description: 'Manage categories', resourceGroup: 'Catalog' },
    { slug: 'grades.manage', description: 'Manage grades', resourceGroup: 'Catalog' },
    { slug: 'products.manage', description: 'Manage products', resourceGroup: 'Catalog' },
    { slug: 'products.read', description: 'View products', resourceGroup: 'Catalog' },
    { slug: 'purchase_orders.manage', description: 'Manage purchase orders', resourceGroup: 'Purchasing' },
  ]);
  accessToken = admin.accessToken;
  authCleanup.userIds.push(admin.userId);
  authCleanup.roleIds.push(admin.roleId);
  authCleanup.permissionIds.push(...admin.createdPermissionIds);
});

afterAll(async () => {
  if (purchaseOrderId) {
    await db.delete(purchaseorderlines).where(eq(purchaseorderlines.purchaseOrderId, purchaseOrderId));
    await db.delete(purchaseorders).where(eq(purchaseorders.id, purchaseOrderId));
  }
  if (productId) {
    await db.delete(productvariants).where(eq(productvariants.productId, productId));
    await db.delete(products).where(eq(products.id, productId));
  }
  const categoryIds = [subCategoryId, rootCategoryId].filter(Boolean) as number[];
  if (categoryIds.length) {
    await db.delete(categories).where(inArray(categories.id, categoryIds));
  }
  if (brandId) {
    await db.delete(brands).where(eq(brands.id, brandId));
  }
  if (gradeId) {
    await db.delete(grades).where(eq(grades.id, gradeId));
  }
  if (stockLocationId) {
    await db.delete(stocklocations).where(eq(stocklocations.id, stockLocationId));
  }
  if (paymentMethodId) {
    await db.delete(paymentmethods).where(eq(paymentmethods.id, paymentMethodId));
  }
  if (vendorId) {
    await db.delete(vendors).where(eq(vendors.id, vendorId));
  }
  if (inUseCurrencyId) {
    await db.delete(currencies).where(eq(currencies.id, inUseCurrencyId));
  }
  if (currencyId) {
    await db.delete(currencies).where(eq(currencies.id, currencyId));
  }
  await cleanupCatalogAuth(authCleanup);
});

describe('settings currencies', () => {
  it('creates a currency', async () => {
    const suffix = crypto.randomUUID().slice(0, 3).toUpperCase();
    const res = await request(app)
      .post('/api/v1/admin/currencies')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Test Currency ${suffix}`,
        code: `TC${suffix}`,
        symbol: '$',
        exchangeRate: 1.25,
        status: 'active',
      });

    expect(res.status).toBe(201);
    currencyId = Number(res.body.id);
    expect(currencyId).toBeTruthy();
  });

  it('creates a currency used by purchase orders', async () => {
    const suffix = crypto.randomUUID().slice(0, 3).toUpperCase();
    const res = await request(app)
      .post('/api/v1/admin/currencies')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `PO Currency ${suffix}`,
        code: `PC${suffix}`,
        symbol: '€',
        exchangeRate: 1.1,
        status: 'active',
      });

    expect(res.status).toBe(201);
    inUseCurrencyId = Number(res.body.id);
    expect(inUseCurrencyId).toBeTruthy();
  });

  it('creates a purchase order using the currency', async () => {
    const vendorRes = await request(app)
      .post('/api/v1/admin/vendors')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Vendor ${Date.now()}`,
        country: 'US',
        status: 'active',
      });
    expect(vendorRes.status).toBe(201);
    vendorId = Number(vendorRes.body.id);

    const methodRes = await request(app)
      .post('/api/v1/admin/payment-methods')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Wire ${crypto.randomUUID().slice(0, 8)}`,
        status: 'active',
      });
    expect(methodRes.status).toBe(201);
    paymentMethodId = Number(methodRes.body.id);

    const locationRes = await request(app)
      .post('/api/v1/admin/stock-locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `PO Warehouse ${Date.now()}`,
        type: 'Warehouse',
        status: 'active',
      });
    expect(locationRes.status).toBe(201);
    stockLocationId = Number(locationRes.body.id);

    const brandRes = await request(app)
      .post('/api/v1/admin/brands')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Brand ${Date.now()}`,
        slug: `brand-${Date.now()}`,
        description: 'Currency test brand',
        status: 'active',
      });
    expect(brandRes.status).toBe(201);
    brandId = Number(brandRes.body.id);

    const rootRes = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Category ${Date.now()}`,
        slug: `category-${Date.now()}`,
        status: 'active',
      });
    expect(rootRes.status).toBe(201);
    rootCategoryId = Number(rootRes.body.id);

    const subRes = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `SubCategory ${Date.now()}`,
        slug: `subcategory-${Date.now()}`,
        parentId: rootCategoryId,
        status: 'active',
      });
    expect(subRes.status).toBe(201);
    subCategoryId = Number(subRes.body.id);

    const gradeRes = await request(app)
      .post('/api/v1/admin/grades')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Grade ${Date.now()}`,
        slug: `grade-${Date.now()}`,
        status: 'active',
      });
    expect(gradeRes.status).toBe(201);
    gradeId = Number(gradeRes.body.id);

    const productRes = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `PO Product ${Date.now()}`,
        shortDescription: 'Short description',
        longDescription: 'Long description',
        status: 'active',
        brandId,
        categoryId: rootCategoryId,
        subCategoryId,
        gradeId,
        images: ['image-1.jpg'],
        variants: [
          {
            sku: `SKU-${Date.now()}`,
            price: 99.99,
            name: 'Default',
            status: 'active',
          },
        ],
      });
    expect(productRes.status).toBe(201);
    productId = Number(productRes.body.id);

    const productDetailRes = await request(app)
      .get(`/api/v1/admin/products/${productId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    const variants = productDetailRes.body?.variants ?? [];
    variantId = Number(variants[0]?.id);
    expect(variantId).toBeTruthy();

    const poRes = await request(app)
      .post('/api/v1/admin/purchase-orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subject: 'Currency usage test',
        vendorId,
        stockLocationId,
        currencyId: inUseCurrencyId,
        paymentTerms: 'Net 30',
        paymentMethodId,
        lines: [
          {
            productVariantId: variantId,
            orderedQty: 2,
            unitCost: 10,
          },
        ],
      });

    expect(poRes.status).toBe(201);
    purchaseOrderId = Number(poRes.body.id);
    expect(purchaseOrderId).toBeTruthy();
  });

  it('lists currencies', async () => {
    const res = await request(app)
      .get('/api/v1/admin/currencies')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((c: { id: number }) => c.id);
    expect(ids).toContain(currencyId);
    expect(ids).toContain(inUseCurrencyId);
  });

  it('updates a currency', async () => {
    if (!currencyId) throw new Error('Missing currency id');
    const res = await request(app)
      .put(`/api/v1/admin/currencies/${currencyId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ exchangeRate: 2.5 });

    expect(res.status).toBe(200);
    expect(Number(res.body.exchangeRate)).toBe(2.5);
  });

  it('deletes a currency', async () => {
    if (!currencyId) throw new Error('Missing currency id');
    const res = await request(app)
      .delete(`/api/v1/admin/currencies/${currencyId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    if (res.body?.action !== undefined) {
      expect(res.body.action).toBe('deleted');
    }
    currencyId = null;
  });

  it('deactivates a currency that is used by purchase orders', async () => {
    if (!inUseCurrencyId) throw new Error('Missing in-use currency id');
    const res = await request(app)
      .delete(`/api/v1/admin/currencies/${inUseCurrencyId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.action).toBe('deactivated');

    const listRes = await request(app)
      .get('/api/v1/admin/currencies')
      .query({ limit: 100, status: 'inactive' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(listRes.status).toBe(200);
    const items = listRes.body?.items ?? listRes.body;
    const ids = (items ?? []).map((c: { id: number }) => c.id);
    expect(ids).toContain(inUseCurrencyId);
  });
});
