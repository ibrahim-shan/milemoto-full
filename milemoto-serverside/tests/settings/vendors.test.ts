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

let vendorId: number | null = null;
let vendorInUseId: number | null = null;
let currencyId: number | null = null;
let paymentMethodId: number | null = null;
let stockLocationId: number | null = null;
let brandId: number | null = null;
let rootCategoryId: number | null = null;
let subCategoryId: number | null = null;
let gradeId: number | null = null;
let productId: number | null = null;
let variantId: number | null = null;
let purchaseOrderId: number | null = null;
let vendorEmail: string | null = null;
let vendorPhoneNumber: string | null = null;
let vendorPhoneCode: string | null = null;

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'vendors.read', description: 'View vendors', resourceGroup: 'Purchasing' },
    { slug: 'vendors.manage', description: 'Manage vendors', resourceGroup: 'Purchasing' },
    { slug: 'settings.manage', description: 'Manage settings', resourceGroup: 'Settings' },
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
  if (currencyId) {
    await db.delete(currencies).where(eq(currencies.id, currencyId));
  }
  const vendorIds = [vendorId, vendorInUseId].filter(Boolean) as number[];
  if (vendorIds.length) {
    await db.delete(vendors).where(inArray(vendors.id, vendorIds));
  }
  await cleanupCatalogAuth(authCleanup);
});

describe('settings vendors', () => {
  it('creates a vendor', async () => {
    const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
    vendorEmail = `vendor-${suffix.toLowerCase()}@example.com`;
    vendorPhoneCode = '+1';
    vendorPhoneNumber = `555${suffix}`;
    const res = await request(app)
      .post('/api/v1/admin/vendors')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Vendor ${suffix}`,
        country: 'US',
        email: vendorEmail,
        phoneCode: vendorPhoneCode,
        phoneNumber: vendorPhoneNumber,
        status: 'active',
      });

    expect(res.status).toBe(201);
    vendorId = Number(res.body.id);
    expect(vendorId).toBeTruthy();
  });

  it('rejects duplicate email', async () => {
    if (!vendorId) throw new Error('Missing vendor id');
    const res = await request(app)
      .post('/api/v1/admin/vendors')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Vendor Email ${Date.now()}`,
        country: 'US',
        email: vendorEmail,
        status: 'active',
      });

    expect(res.status).toBe(409);
    expect(res.body?.code).toBe('DuplicateVendorContact');
  });

  it('rejects duplicate phone number + code', async () => {
    const res = await request(app)
      .post('/api/v1/admin/vendors')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Vendor Phone ${Date.now()}`,
        country: 'US',
        phoneCode: vendorPhoneCode,
        phoneNumber: vendorPhoneNumber,
        status: 'active',
      });

    expect(res.status).toBe(409);
    expect(res.body?.code).toBe('DuplicateVendorContact');
  });

  it('creates a purchase order tied to a vendor', async () => {
    const suffix = crypto.randomUUID().slice(0, 3).toUpperCase();
    const currencyRes = await request(app)
      .post('/api/v1/admin/currencies')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `PO Currency ${suffix}`,
        code: `PC${suffix}`,
        symbol: '$',
        exchangeRate: 1.1,
        status: 'active',
      });
    expect(currencyRes.status).toBe(201);
    currencyId = Number(currencyRes.body.id);

    const vendorRes = await request(app)
      .post('/api/v1/admin/vendors')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Vendor PO ${suffix}`,
        country: 'US',
        status: 'active',
      });
    expect(vendorRes.status).toBe(201);
    vendorInUseId = Number(vendorRes.body.id);

    const methodRes = await request(app)
      .post('/api/v1/admin/payment-methods')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Wire ${Date.now()}`, status: 'active' });
    expect(methodRes.status).toBe(201);
    paymentMethodId = Number(methodRes.body.id);

    const locationRes = await request(app)
      .post('/api/v1/admin/stock-locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Warehouse ${Date.now()}`,
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
        description: 'Vendor test brand',
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
        name: `Vendor Product ${Date.now()}`,
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
        subject: 'Vendor delete guard',
        vendorId: vendorInUseId,
        stockLocationId,
        currencyId,
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

  it('blocks delete when vendor has purchase orders', async () => {
    if (!vendorInUseId) throw new Error('Missing vendor id');
    const res = await request(app)
      .delete(`/api/v1/admin/vendors/${vendorInUseId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(409);
    expect(res.body?.code).toBe('VendorInUse');
  });

  it('deletes a vendor that is not in use', async () => {
    if (!vendorId) throw new Error('Missing vendor id');
    const res = await request(app)
      .delete(`/api/v1/admin/vendors/${vendorId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    vendorId = null;
  });
});
