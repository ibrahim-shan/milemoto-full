import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from '../catalog/helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

let countryId: number | null = null;
let stateId: number | null = null;
let cityId: number | null = null;

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

describe('settings location geo', () => {
  it('creates a country', async () => {
    const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();
    const res = await request(app)
      .post('/api/v1/admin/locations/countries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Testland ${suffix}`,
        code: `TL${suffix}`,
        status: 'active',
      });

    expect(res.status).toBe(201);
    countryId = Number(res.body.id);
    expect(countryId).toBeTruthy();
  });

  it('lists countries', async () => {
    const res = await request(app)
      .get('/api/v1/admin/locations/countries')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((c: { id: number }) => c.id);
    expect(ids).toContain(countryId);
  });

  it('updates a country', async () => {
    if (!countryId) throw new Error('Missing country id');
    const res = await request(app)
      .put(`/api/v1/admin/locations/countries/${countryId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Testland' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Testland');
  });

  it('creates a state', async () => {
    if (!countryId) throw new Error('Missing country id');
    const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();
    const res = await request(app)
      .post('/api/v1/admin/locations/states')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Test State ${suffix}`,
        countryId,
        status: 'active',
      });

    expect(res.status).toBe(201);
    stateId = Number(res.body.id);
    expect(stateId).toBeTruthy();
  });

  it('lists states', async () => {
    const res = await request(app)
      .get('/api/v1/admin/locations/states')
      .query({ limit: 100, countryId })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((s: { id: number }) => s.id);
    expect(ids).toContain(stateId);
  });

  it('updates a state', async () => {
    if (!stateId) throw new Error('Missing state id');
    const res = await request(app)
      .put(`/api/v1/admin/locations/states/${stateId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated State' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated State');
  });

  it('creates a city', async () => {
    if (!stateId) throw new Error('Missing state id');
    const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();
    const res = await request(app)
      .post('/api/v1/admin/locations/cities')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Test City ${suffix}`,
        stateId,
        status: 'active',
      });

    expect(res.status).toBe(201);
    cityId = Number(res.body.id);
    expect(cityId).toBeTruthy();
  });

  it('lists cities', async () => {
    const res = await request(app)
      .get('/api/v1/admin/locations/cities')
      .query({ limit: 100, stateId })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((c: { id: number }) => c.id);
    expect(ids).toContain(cityId);
  });

  it('updates a city', async () => {
    if (!cityId) throw new Error('Missing city id');
    const res = await request(app)
      .put(`/api/v1/admin/locations/cities/${cityId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated City' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated City');
  });

  it('deletes a city', async () => {
    if (!cityId) throw new Error('Missing city id');
    const res = await request(app)
      .delete(`/api/v1/admin/locations/cities/${cityId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    cityId = null;
  });

  it('deletes a state', async () => {
    if (!stateId) throw new Error('Missing state id');
    const res = await request(app)
      .delete(`/api/v1/admin/locations/states/${stateId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    stateId = null;
  });

  it('deletes a country', async () => {
    if (!countryId) throw new Error('Missing country id');
    const res = await request(app)
      .delete(`/api/v1/admin/locations/countries/${countryId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    countryId = null;
  });
});
