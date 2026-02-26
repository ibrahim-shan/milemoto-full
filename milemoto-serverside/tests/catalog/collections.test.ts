import crypto from 'node:crypto';
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

let collectionId: number | null = null;
let productVariantId: number | null = null;
let setupProductId: number | null = null;
let setupBrandId: number | null = null;
let setupCategoryId: number | null = null;
let setupSubCategoryId: number | null = null;
let setupGradeId: number | null = null;

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'collections.read', description: 'View collections', resourceGroup: 'Catalog' },
    { slug: 'collections.manage', description: 'Manage collections', resourceGroup: 'Catalog' },
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

  // Create supporting entities and a product with a variant for collection product tests
  const s = crypto.randomUUID().slice(0, 6);
  const brandRes = await request(app)
    .post('/api/v1/admin/brands')
    .set('Authorization', `Bearer ${admin.accessToken}`)
    .send({ name: `Brand ${s}`, slug: `brand-${s}`, status: 'active' });
  setupBrandId = Number(brandRes.body.id);

  const catRes = await request(app)
    .post('/api/v1/admin/categories')
    .set('Authorization', `Bearer ${admin.accessToken}`)
    .send({ name: `Cat ${s}`, slug: `cat-${s}`, status: 'active' });
  expect(catRes.status).toBe(201);
  setupCategoryId = Number(catRes.body.id);

  const subCatRes = await request(app)
    .post('/api/v1/admin/categories')
    .set('Authorization', `Bearer ${admin.accessToken}`)
    .send({ name: `SubCat ${s}`, slug: `subcat-${s}`, parentId: setupCategoryId, status: 'active' });
  expect(subCatRes.status).toBe(201);
  setupSubCategoryId = Number(subCatRes.body.id);

  const gradeRes = await request(app)
    .post('/api/v1/admin/grades')
    .set('Authorization', `Bearer ${admin.accessToken}`)
    .send({ name: `Grade ${s}`, slug: `grade-${s}`, status: 'active' });
  expect(gradeRes.status).toBe(201);
  setupGradeId = Number(gradeRes.body.id);

  const prodRes = await request(app)
    .post('/api/v1/admin/products')
    .set('Authorization', `Bearer ${admin.accessToken}`)
    .send({
      name: `CollProduct ${s}`,
      shortDescription: 'test',
      longDescription: 'test',
      status: 'active',
      brandId: setupBrandId,
      categoryId: setupCategoryId,
      subCategoryId: setupSubCategoryId,
      gradeId: setupGradeId,
      images: ['image-1.jpg'],
      variants: [{ sku: `SKU-COLL-${s}`, price: 10, name: 'Default', status: 'active' }],
    });
  expect(prodRes.status).toBe(201);
  setupProductId = Number(prodRes.body.id);
  // Product create response may not include nested variants; load detail to get the created variant id.
  if (setupProductId) {
    const productDetailRes = await request(app)
      .get(`/api/v1/admin/products/${setupProductId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(productDetailRes.status).toBe(200);
    const variants = productDetailRes.body?.variants ?? [];
    productVariantId = variants[0]?.id ? Number(variants[0].id) : null;
  }
});

afterAll(async () => {
  await cleanupCatalogAuth(authCleanup);
});

describe('catalog collections', () => {
  it('creates a manual collection', async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const res = await request(app)
      .post('/api/v1/admin/collections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Collection ${suffix}`,
        slug: `collection-${suffix}`,
        status: 'active',
        type: 'manual',
        matchType: 'all',
        rules: [],
      });

    expect(res.status).toBe(201);
    collectionId = Number(res.body.id);
    expect(collectionId).toBeTruthy();
  });

  it('lists collections', async () => {
    const res = await request(app)
      .get('/api/v1/admin/collections')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((c: { id: number }) => c.id);
    expect(ids).toContain(collectionId);
  });

  it('gets a collection by id', async () => {
    if (!collectionId) throw new Error('Missing collection id');
    const res = await request(app)
      .get(`/api/v1/admin/collections/${collectionId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.id)).toBe(collectionId);
  });

  it('updates a collection', async () => {
    if (!collectionId) throw new Error('Missing collection id');
    const res = await request(app)
      .put(`/api/v1/admin/collections/${collectionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Collection' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Collection');
  });

  it('previews a collection (manual)', async () => {
    if (!collectionId) throw new Error('Missing collection id');
    const res = await request(app)
      .post(`/api/v1/admin/collections/${collectionId}/preview`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rules: [] });

    expect(res.status).toBe(400);
    expect(res.body?.message).toBe('Preview is only available for automatic collections');
  });

  it('adds products (variants) to a manual collection', async () => {
    if (!collectionId) throw new Error('Missing collection id');
    if (!productVariantId) throw new Error('Missing product variant id (product setup failed)');

    const res = await request(app)
      .post(`/api/v1/admin/collections/${collectionId}/products`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ variantIds: [productVariantId] });

    if (res.status !== 200) {
      throw new Error(
        `Failed to add variant to collection: status=${res.status} body=${JSON.stringify(res.body)}`
      );
    }
    expect(res.status).toBe(200);
  });

  it('lists products in a collection', async () => {
    if (!collectionId) throw new Error('Missing collection id');

    const res = await request(app)
      .get(`/api/v1/admin/collections/${collectionId}/products`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
  });

  it('removes a product variant from a manual collection', async () => {
    if (!collectionId) throw new Error('Missing collection id');
    if (!productVariantId) throw new Error('Missing product variant id');

    const res = await request(app)
      .delete(`/api/v1/admin/collections/${collectionId}/products/${productVariantId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
  });

  it('deletes a collection', async () => {
    if (!collectionId) throw new Error('Missing collection id');
    const res = await request(app)
      .delete(`/api/v1/admin/collections/${collectionId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    collectionId = null;
  });
});

afterAll(async () => {
  // Cleanup product and supporting catalog entities created for product-in-collection tests
  if (setupProductId)
    await request(app)
      .delete(`/api/v1/admin/products/${setupProductId}`)
      .set('Authorization', `Bearer ${accessToken}`);
  if (setupSubCategoryId)
    await request(app)
      .delete(`/api/v1/admin/categories/${setupSubCategoryId}`)
      .set('Authorization', `Bearer ${accessToken}`);
  if (setupCategoryId)
    await request(app)
      .delete(`/api/v1/admin/categories/${setupCategoryId}`)
      .set('Authorization', `Bearer ${accessToken}`);
  if (setupBrandId)
    await request(app)
      .delete(`/api/v1/admin/brands/${setupBrandId}`)
      .set('Authorization', `Bearer ${accessToken}`);
  if (setupGradeId)
    await request(app)
      .delete(`/api/v1/admin/grades/${setupGradeId}`)
      .set('Authorization', `Bearer ${accessToken}`);
});
