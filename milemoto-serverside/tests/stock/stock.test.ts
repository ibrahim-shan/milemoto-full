import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import {
  brands,
  categories,
  grades,
  products,
  productvariants,
  stocklevels,
  stocklocations,
  stockmovements,
} from '@milemoto/types';
import { createCatalogAdmin, cleanupCatalogAuth } from '../catalog/helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

let brandId: number | null = null;
let rootCategoryId: number | null = null;
let subCategoryId: number | null = null;
let gradeId: number | null = null;
let productId: number | null = null;
let variantId: number | null = null;
let fromLocationId: number | null = null;
let toLocationId: number | null = null;

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'brands.manage', description: 'Manage brands', resourceGroup: 'Catalog' },
    { slug: 'categories.manage', description: 'Manage categories', resourceGroup: 'Catalog' },
    { slug: 'grades.manage', description: 'Manage grades', resourceGroup: 'Catalog' },
    { slug: 'products.manage', description: 'Manage products', resourceGroup: 'Catalog' },
    { slug: 'products.read', description: 'View products', resourceGroup: 'Catalog' },
    { slug: 'locations.read', description: 'View locations', resourceGroup: 'Settings' },
    { slug: 'locations.manage', description: 'Manage locations', resourceGroup: 'Settings' },
    { slug: 'stock.read', description: 'View stock', resourceGroup: 'Stock' },
    { slug: 'stock_movements.read', description: 'View stock movements', resourceGroup: 'Stock' },
    { slug: 'stock_movements.manage', description: 'Manage stock movements', resourceGroup: 'Stock' },
  ]);
  accessToken = admin.accessToken;
  authCleanup.userIds.push(admin.userId);
  authCleanup.roleIds.push(admin.roleId);
  authCleanup.permissionIds.push(...admin.createdPermissionIds);

  const brandRes = await request(app)
    .post('/api/v1/admin/brands')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: `Brand ${Date.now()}`,
      slug: `brand-${Date.now()}`,
      description: 'Stock brand',
      status: 'active',
    });
  brandId = Number(brandRes.body.id);

  const rootRes = await request(app)
    .post('/api/v1/admin/categories')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: `Category ${Date.now()}`,
      slug: `category-${Date.now()}`,
      status: 'active',
    });
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
  subCategoryId = Number(subRes.body.id);

  const gradeRes = await request(app)
    .post('/api/v1/admin/grades')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: `Grade ${Date.now()}`,
      slug: `grade-${Date.now()}`,
      status: 'active',
    });
  gradeId = Number(gradeRes.body.id);

  const productRes = await request(app)
    .post('/api/v1/admin/products')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: `Stock Product ${Date.now()}`,
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
          price: 49.99,
          name: 'Default',
          status: 'active',
        },
      ],
    });
  productId = Number(productRes.body.id);

  const productDetailRes = await request(app)
    .get(`/api/v1/admin/products/${productId}`)
    .set('Authorization', `Bearer ${accessToken}`);
  const variants = productDetailRes.body?.variants ?? [];
  variantId = Number(variants[0]?.id);

  const fromLocRes = await request(app)
    .post('/api/v1/admin/stock-locations')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: `Warehouse A ${Date.now()}`,
      type: 'Warehouse',
      status: 'active',
    });
  fromLocationId = Number(fromLocRes.body.id);

  const toLocRes = await request(app)
    .post('/api/v1/admin/stock-locations')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: `Warehouse B ${Date.now()}`,
      type: 'Warehouse',
      status: 'active',
    });
  toLocationId = Number(toLocRes.body.id);
});

afterAll(async () => {
  if (variantId) {
    await db.delete(stockmovements).where(eq(stockmovements.productVariantId, variantId));
    await db.delete(stocklevels).where(eq(stocklevels.productVariantId, variantId));
  }
  if (productId) {
    await db.delete(productvariants).where(eq(productvariants.productId, productId));
    await db.delete(products).where(eq(products.id, productId));
  }
  if (subCategoryId) {
    await db.delete(categories).where(eq(categories.id, subCategoryId));
  }
  if (rootCategoryId) {
    await db.delete(categories).where(eq(categories.id, rootCategoryId));
  }
  if (brandId) {
    await db.delete(brands).where(eq(brands.id, brandId));
  }
  if (gradeId) {
    await db.delete(grades).where(eq(grades.id, gradeId));
  }
  const locationIds = [fromLocationId, toLocationId].filter(Boolean) as number[];
  if (locationIds.length) {
    await db.delete(stocklocations).where(inArray(stocklocations.id, locationIds));
  }

  await cleanupCatalogAuth(authCleanup);
});

describe('stock', () => {
  it('creates a stock adjustment and updates stock levels', async () => {
    const res = await request(app)
      .post('/api/v1/admin/stock/adjustments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        productVariantId: variantId,
        stockLocationId: fromLocationId,
        quantity: 10,
        note: 'Initial stock',
      });

    expect(res.status).toBe(201);
    expect(res.body?.type).toBe('adjustment');
    expect(res.body?.quantity).toBe(10);

    const levelRes = await request(app)
      .get('/api/v1/admin/stock')
      .query({ limit: 50, productVariantId: variantId, stockLocationId: fromLocationId })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(levelRes.status).toBe(200);
    const items = levelRes.body?.items ?? levelRes.body;
    expect(items?.[0]?.onHand).toBe(10);
  });

  it('creates a stock transfer and updates both locations', async () => {
    const res = await request(app)
      .post('/api/v1/admin/stock/transfers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        productVariantId: variantId,
        fromLocationId: fromLocationId,
        toLocationId: toLocationId,
        quantity: 4,
        note: 'Move stock',
      });

    expect(res.status).toBe(201);
    expect(res.body?.type).toBe('transfer_out');

    const fromRes = await request(app)
      .get('/api/v1/admin/stock')
      .query({ limit: 50, productVariantId: variantId, stockLocationId: fromLocationId })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(fromRes.status).toBe(200);
    const fromItems = fromRes.body?.items ?? fromRes.body;
    expect(fromItems?.[0]?.onHand).toBe(6);

    const toRes = await request(app)
      .get('/api/v1/admin/stock')
      .query({ limit: 50, productVariantId: variantId, stockLocationId: toLocationId })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(toRes.status).toBe(200);
    const toItems = toRes.body?.items ?? toRes.body;
    expect(toItems?.[0]?.onHand).toBe(4);
  });

  it('lists stock movements', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stock/movements')
      .query({ limit: 50, productVariantId: variantId })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const types = (items ?? []).map((m: { type: string }) => m.type);
    expect(types).toContain('adjustment');
    expect(types).toContain('transfer_out');
    expect(types).toContain('transfer_in');
  });
});
