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
let areaRateCountryId: number | null = null;
let areaRateStateId: number | null = null;
let areaRateCityId: number | null = null;

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

describe('settings shipping', () => {
  it('lists shipping methods', async () => {
    const res = await request(app)
      .get('/api/v1/admin/shipping/methods')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const codes = (res.body ?? []).map((m: { code: string }) => m.code);
    expect(codes).toContain('flatRate');
    expect(codes).toContain('areaWise');
    expect(codes).toContain('productWise');
  });

  it('updates a shipping method', async () => {
    const res = await request(app)
      .put('/api/v1/admin/shipping/methods/flatRate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'active', cost: 9.99 });

    expect(res.status).toBe(200);
    expect(res.body?.code).toBe('flatRate');
    expect(res.body?.status).toBe('active');
    expect(Number(res.body?.cost)).toBe(9.99);
  });

  it('creates an area rate', async () => {
    const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();
    const countryRes = await request(app)
      .post('/api/v1/admin/locations/countries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Shipland ${suffix}`,
        code: `SL${suffix}`,
        status: 'active',
      });

    expect(countryRes.status).toBe(201);
    countryId = Number(countryRes.body.id);
    expect(countryId).toBeTruthy();

    const res = await request(app)
      .post('/api/v1/admin/shipping/area-rates')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        countryId,
        cost: 12.5,
      });

    expect(res.status).toBe(201);
    areaRateCountryId = Number(res.body.id);
    expect(areaRateCountryId).toBeTruthy();
  });

  it('creates a state and city for area rates', async () => {
    if (!countryId) throw new Error('Missing country id');
    const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();
    const stateRes = await request(app)
      .post('/api/v1/admin/locations/states')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Ship State ${suffix}`,
        countryId,
        status: 'active',
      });

    expect(stateRes.status).toBe(201);
    stateId = Number(stateRes.body.id);
    expect(stateId).toBeTruthy();

    const cityRes = await request(app)
      .post('/api/v1/admin/locations/cities')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Ship City ${suffix}`,
        stateId,
        status: 'active',
      });

    expect(cityRes.status).toBe(201);
    cityId = Number(cityRes.body.id);
    expect(cityId).toBeTruthy();
  });

  it('creates a state-level area rate', async () => {
    if (!countryId || !stateId) throw new Error('Missing country or state id');
    const res = await request(app)
      .post('/api/v1/admin/shipping/area-rates')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        countryId,
        stateId,
        cost: 15,
      });

    expect(res.status).toBe(201);
    areaRateStateId = Number(res.body.id);
    expect(areaRateStateId).toBeTruthy();
  });

  it('creates a city-level area rate', async () => {
    if (!countryId || !stateId || !cityId) throw new Error('Missing location ids');
    const res = await request(app)
      .post('/api/v1/admin/shipping/area-rates')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        countryId,
        stateId,
        cityId,
        cost: 18,
      });

    expect(res.status).toBe(201);
    areaRateCityId = Number(res.body.id);
    expect(areaRateCityId).toBeTruthy();
  });

  it('rejects duplicate area rates for the same location', async () => {
    if (!countryId || !stateId || !cityId) throw new Error('Missing location ids');
    const res = await request(app)
      .post('/api/v1/admin/shipping/area-rates')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        countryId,
        stateId,
        cityId,
        cost: 19,
      });

    expect(res.status).toBe(409);
  });

  it('lists area rates', async () => {
    const res = await request(app)
      .get('/api/v1/admin/shipping/area-rates')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((r: { id: number }) => r.id);
    expect(ids).toContain(areaRateCountryId);
    expect(ids).toContain(areaRateStateId);
    expect(ids).toContain(areaRateCityId);
  });

  it('updates an area rate', async () => {
    if (!areaRateCountryId) throw new Error('Missing area rate id');
    const res = await request(app)
      .put(`/api/v1/admin/shipping/area-rates/${areaRateCountryId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ cost: 20 });

    expect(res.status).toBe(200);
    expect(Number(res.body?.cost)).toBe(20);
  });

  it('prevents deleting city used by an area rate', async () => {
    if (!cityId) throw new Error('Missing city id');
    const res = await request(app)
      .delete(`/api/v1/admin/locations/cities/${cityId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });

  it('prevents deleting state used by an area rate', async () => {
    if (!stateId) throw new Error('Missing state id');
    const res = await request(app)
      .delete(`/api/v1/admin/locations/states/${stateId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });

  it('prevents deleting country used by an area rate', async () => {
    if (!countryId) throw new Error('Missing country id');
    const res = await request(app)
      .delete(`/api/v1/admin/locations/countries/${countryId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });

  it('deletes area rates', async () => {
    const ids = [areaRateCityId, areaRateStateId, areaRateCountryId].filter(
      (id): id is number => typeof id === 'number' && Number.isFinite(id)
    );
    for (const id of ids) {
      const res = await request(app)
        .delete(`/api/v1/admin/shipping/area-rates/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(204);
    }
    areaRateCityId = null;
    areaRateStateId = null;
    areaRateCountryId = null;
  });

  it('deletes city, state, and country after area rates are removed', async () => {
    if (!cityId || !stateId || !countryId) throw new Error('Missing location ids');
    const cityRes = await request(app)
      .delete(`/api/v1/admin/locations/cities/${cityId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(cityRes.status).toBe(204);
    cityId = null;

    const stateRes = await request(app)
      .delete(`/api/v1/admin/locations/states/${stateId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(stateRes.status).toBe(204);
    stateId = null;

    const countryRes = await request(app)
      .delete(`/api/v1/admin/locations/countries/${countryId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(countryRes.status).toBe(204);
    countryId = null;
  });

});
