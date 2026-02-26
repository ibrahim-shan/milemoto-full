import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from './helpers.js';

let accessToken = '';
const authCleanup = {
  userIds: [] as number[],
  roleIds: [] as number[],
  permissionIds: [] as number[],
};

let brandId: number | null = null;
let rootCategoryId: number | null = null;
let subCategoryId: number | null = null;
let gradeId: number | null = null;
let productId: number | null = null;

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'brands.manage', description: 'Manage brands', resourceGroup: 'Catalog' },
    { slug: 'categories.manage', description: 'Manage categories', resourceGroup: 'Catalog' },
    { slug: 'grades.manage', description: 'Manage grades', resourceGroup: 'Catalog' },
    { slug: 'products.manage', description: 'Manage products', resourceGroup: 'Catalog' },
    { slug: 'products.read', description: 'View products', resourceGroup: 'Catalog' },
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
      description: 'Catalog brand',
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
});

afterAll(async () => {
  if (productId) {
    await request(app)
      .delete(`/api/v1/admin/products/${productId}`)
      .set('Authorization', `Bearer ${accessToken}`);
  }
  if (subCategoryId) {
    await request(app)
      .delete(`/api/v1/admin/categories/${subCategoryId}`)
      .set('Authorization', `Bearer ${accessToken}`);
  }
  if (rootCategoryId) {
    await request(app)
      .delete(`/api/v1/admin/categories/${rootCategoryId}`)
      .set('Authorization', `Bearer ${accessToken}`);
  }
  if (brandId) {
    await request(app)
      .delete(`/api/v1/admin/brands/${brandId}`)
      .set('Authorization', `Bearer ${accessToken}`);
  }
  if (gradeId) {
    await request(app)
      .delete(`/api/v1/admin/grades/${gradeId}`)
      .set('Authorization', `Bearer ${accessToken}`);
  }

  await cleanupCatalogAuth(authCleanup);
});

describe('catalog products', () => {
  it('creates a product', async () => {
    const res = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Product ${Date.now()}`,
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

    expect(res.status).toBe(201);
    productId = Number(res.body.id);
    expect(productId).toBeTruthy();
  });

  it('lists products', async () => {
    const res = await request(app)
      .get('/api/v1/admin/products')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((p: { id: number }) => p.id);
    expect(ids).toContain(productId);
  });

  it('gets a product by id', async () => {
    if (!productId) throw new Error('Missing product id');
    const res = await request(app)
      .get(`/api/v1/admin/products/${productId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body?.id).toBe(productId);
  });

  it('updates a product', async () => {
    if (!productId) throw new Error('Missing product id');
    const res = await request(app)
      .put(`/api/v1/admin/products/${productId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Product ${Date.now()} Updated`,
      });

    expect(res.status).toBe(200);
    expect(res.body?.name).toContain('Updated');
  });

  it('lists all product variants', async () => {
    const res = await request(app)
      .get('/api/v1/admin/products/variants')
      .query({ limit: 50 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('deletes a product', async () => {
    if (!productId) throw new Error('Missing product id');
    const res = await request(app)
      .delete(`/api/v1/admin/products/${productId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    productId = null;
  });
});
