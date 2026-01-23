import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from '../catalog/helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

let taxId: number | null = null;
let duplicateTaxId: number | null = null;
let countryId: number | null = null;

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'settings.read', description: 'View settings', resourceGroup: 'Settings' },
    { slug: 'settings.manage', description: 'Manage settings', resourceGroup: 'Settings' },
  ]);
  accessToken = admin.accessToken;
  authCleanup.userIds.push(admin.userId);
  authCleanup.roleIds.push(admin.roleId);
  authCleanup.permissionIds.push(...admin.createdPermissionIds);
});

afterAll(async () => {
  await cleanupCatalogAuth(authCleanup);
});

describe('settings taxes', () => {
  it('creates a tax', async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const res = await request(app)
      .post('/api/v1/admin/taxes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Tax ${suffix}`,
        rate: 5,
        type: 'percentage',
        status: 'active',
        countryId: null,
      });

    expect(res.status).toBe(201);
    taxId = Number(res.body.id);
    expect(taxId).toBeTruthy();
  });

  it('creates a country for regional tax', async () => {
    const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();
    const res = await request(app)
      .post('/api/v1/admin/locations/countries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Taxland ${suffix}`,
        code: `TX${suffix}`,
        status: 'active',
      });

    expect(res.status).toBe(201);
    countryId = Number(res.body.id);
    expect(countryId).toBeTruthy();
  });

  it('rejects duplicate tax rules for the same region', async () => {
    if (!countryId) throw new Error('Missing country id');
    const res = await request(app)
      .post('/api/v1/admin/taxes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Regional VAT',
        rate: 5,
        type: 'percentage',
        status: 'active',
        countryId,
      });

    expect(res.status).toBe(201);
    duplicateTaxId = Number(res.body.id);
    expect(duplicateTaxId).toBeTruthy();

    const dupRes = await request(app)
      .post('/api/v1/admin/taxes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Regional VAT',
        rate: 5,
        type: 'percentage',
        status: 'active',
        countryId,
      });

    expect(dupRes.status).toBe(409);
  });

  it('lists taxes', async () => {
    const res = await request(app)
      .get('/api/v1/admin/taxes')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((t: { id: number }) => t.id);
    expect(ids).toContain(taxId);
    expect(ids).toContain(duplicateTaxId);
  });

  it('filters taxes by search', async () => {
    const res = await request(app)
      .get('/api/v1/admin/taxes')
      .query({ limit: 100, search: 'Regional VAT' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((t: { id: number }) => t.id);
    expect(ids).toContain(duplicateTaxId);
  });

  it('updates a tax', async () => {
    if (!taxId) throw new Error('Missing tax id');
    const res = await request(app)
      .put(`/api/v1/admin/taxes/${taxId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rate: 7.5 });

    expect(res.status).toBe(200);
    expect(Number(res.body.rate)).toBe(7.5);
  });

  it('deletes a tax', async () => {
    if (!taxId) throw new Error('Missing tax id');
    const res = await request(app)
      .delete(`/api/v1/admin/taxes/${taxId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    taxId = null;
  });

  it('deletes the duplicate tax and country', async () => {
    if (!duplicateTaxId) throw new Error('Missing duplicate tax id');
    const taxRes = await request(app)
      .delete(`/api/v1/admin/taxes/${duplicateTaxId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(taxRes.status).toBe(204);
    duplicateTaxId = null;

    if (!countryId) throw new Error('Missing country id');
    const countryRes = await request(app)
      .delete(`/api/v1/admin/locations/countries/${countryId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(countryRes.status).toBe(204);
    countryId = null;
  });
});
