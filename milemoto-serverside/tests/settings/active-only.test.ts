import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { inArray } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import {
  currencies,
  taxes,
  paymentmethods,
  stocklocations,
  inboundshippingmethods,
  vendors,
  languages,
} from '@milemoto/types';
import { createCatalogAdmin, cleanupCatalogAuth } from '../catalog/helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

const currencyIds: number[] = [];
const taxIds: number[] = [];
const paymentMethodIds: number[] = [];
const stockLocationIds: number[] = [];
const inboundShippingIds: number[] = [];
const vendorIds: number[] = [];
const languageIds: number[] = [];

const activeIds = {
  currency: 0,
  tax: 0,
  paymentMethod: 0,
  stockLocation: 0,
  inboundShipping: 0,
  vendor: 0,
  language: 0,
};

const inactiveIds = {
  currency: 0,
  tax: 0,
  paymentMethod: 0,
  stockLocation: 0,
  inboundShipping: 0,
  vendor: 0,
  language: 0,
};

beforeAll(async () => {
  const admin = await createCatalogAdmin([
    { slug: 'settings.read', description: 'View settings', resourceGroup: 'Settings' },
    { slug: 'settings.manage', description: 'Manage settings', resourceGroup: 'Settings' },
    { slug: 'vendors.read', description: 'View vendors', resourceGroup: 'Purchasing' },
    { slug: 'vendors.manage', description: 'Manage vendors', resourceGroup: 'Purchasing' },
    { slug: 'locations.read', description: 'View locations', resourceGroup: 'Settings' },
    { slug: 'locations.manage', description: 'Manage locations', resourceGroup: 'Settings' },
  ]);
  accessToken = admin.accessToken;
  authCleanup.userIds.push(admin.userId);
  authCleanup.roleIds.push(admin.roleId);
  authCleanup.permissionIds.push(...admin.createdPermissionIds);
});

afterAll(async () => {
  if (currencyIds.length) {
    await db.delete(currencies).where(inArray(currencies.id, currencyIds));
  }
  if (taxIds.length) {
    await db.delete(taxes).where(inArray(taxes.id, taxIds));
  }
  if (paymentMethodIds.length) {
    await db.delete(paymentmethods).where(inArray(paymentmethods.id, paymentMethodIds));
  }
  if (stockLocationIds.length) {
    await db.delete(stocklocations).where(inArray(stocklocations.id, stockLocationIds));
  }
  if (inboundShippingIds.length) {
    await db.delete(inboundshippingmethods).where(inArray(inboundshippingmethods.id, inboundShippingIds));
  }
  if (vendorIds.length) {
    await db.delete(vendors).where(inArray(vendors.id, vendorIds));
  }
  if (languageIds.length) {
    await db.delete(languages).where(inArray(languages.id, languageIds));
  }
  await cleanupCatalogAuth(authCleanup);
});

describe('settings list endpoints (active-only)', () => {
  it('creates active + inactive fixtures', async () => {
    const suffix = crypto.randomUUID().slice(0, 3).toUpperCase();

    const currencyActive = await request(app)
      .post('/api/v1/admin/currencies')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Active Currency ${suffix}`,
        code: `AC${suffix}`,
        symbol: '$',
        exchangeRate: 1.25,
        status: 'active',
      });
    expect(currencyActive.status).toBe(201);
    activeIds.currency = Number(currencyActive.body.id);
    currencyIds.push(activeIds.currency);

    const currencyInactive = await request(app)
      .post('/api/v1/admin/currencies')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Inactive Currency ${suffix}`,
        code: `IC${suffix}`,
        symbol: 'E',
        exchangeRate: 1.15,
        status: 'inactive',
      });
    expect(currencyInactive.status).toBe(201);
    inactiveIds.currency = Number(currencyInactive.body.id);
    currencyIds.push(inactiveIds.currency);

    const taxActive = await request(app)
      .post('/api/v1/admin/taxes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Active Tax ${suffix}`,
        rate: 5,
        type: 'percentage',
        status: 'active',
        countryId: null,
      });
    expect(taxActive.status).toBe(201);
    activeIds.tax = Number(taxActive.body.id);
    taxIds.push(activeIds.tax);

    const taxInactive = await request(app)
      .post('/api/v1/admin/taxes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Inactive Tax ${suffix}`,
        rate: 7,
        type: 'percentage',
        status: 'inactive',
        countryId: null,
      });
    expect(taxInactive.status).toBe(201);
    inactiveIds.tax = Number(taxInactive.body.id);
    taxIds.push(inactiveIds.tax);

    const paymentActive = await request(app)
      .post('/api/v1/admin/payment-methods')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Active Pay ${suffix}`, status: 'active' });
    expect(paymentActive.status).toBe(201);
    activeIds.paymentMethod = Number(paymentActive.body.id);
    paymentMethodIds.push(activeIds.paymentMethod);

    const paymentInactive = await request(app)
      .post('/api/v1/admin/payment-methods')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Inactive Pay ${suffix}`, status: 'inactive' });
    expect(paymentInactive.status).toBe(201);
    inactiveIds.paymentMethod = Number(paymentInactive.body.id);
    paymentMethodIds.push(inactiveIds.paymentMethod);

    const locationActive = await request(app)
      .post('/api/v1/admin/stock-locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Active Location ${suffix}`, type: 'Warehouse', status: 'active' });
    expect(locationActive.status).toBe(201);
    activeIds.stockLocation = Number(locationActive.body.id);
    stockLocationIds.push(activeIds.stockLocation);

    const locationInactive = await request(app)
      .post('/api/v1/admin/stock-locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Inactive Location ${suffix}`, type: 'Warehouse', status: 'inactive' });
    expect(locationInactive.status).toBe(201);
    inactiveIds.stockLocation = Number(locationInactive.body.id);
    stockLocationIds.push(inactiveIds.stockLocation);

    const inboundActive = await request(app)
      .post('/api/v1/admin/inbound-shipping-methods')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: `air-${suffix}`, name: `Air ${suffix}`, status: 'active' });
    expect(inboundActive.status).toBe(201);
    activeIds.inboundShipping = Number(inboundActive.body.id);
    inboundShippingIds.push(activeIds.inboundShipping);

    const inboundInactive = await request(app)
      .post('/api/v1/admin/inbound-shipping-methods')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: `sea-${suffix}`, name: `Sea ${suffix}`, status: 'inactive' });
    expect(inboundInactive.status).toBe(201);
    inactiveIds.inboundShipping = Number(inboundInactive.body.id);
    inboundShippingIds.push(inactiveIds.inboundShipping);

    const vendorActive = await request(app)
      .post('/api/v1/admin/vendors')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Active Vendor ${suffix}`, country: 'US', status: 'active' });
    expect(vendorActive.status).toBe(201);
    activeIds.vendor = Number(vendorActive.body.id);
    vendorIds.push(activeIds.vendor);

    const vendorInactive = await request(app)
      .post('/api/v1/admin/vendors')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Inactive Vendor ${suffix}`, country: 'US', status: 'inactive' });
    expect(vendorInactive.status).toBe(201);
    inactiveIds.vendor = Number(vendorInactive.body.id);
    vendorIds.push(inactiveIds.vendor);

    const langCode = `t${suffix.toLowerCase()}`;
    const languageActive = await request(app)
      .post('/api/v1/admin/languages')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Active Lang ${suffix}`,
        code: `${langCode}a`,
        displayMode: 'LTR',
        countryCode: 'LB',
        status: 'active',
      });
    expect(languageActive.status).toBe(201);
    activeIds.language = Number(languageActive.body.id);
    languageIds.push(activeIds.language);

    const languageInactive = await request(app)
      .post('/api/v1/admin/languages')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Inactive Lang ${suffix}`,
        code: `${langCode}i`,
        displayMode: 'LTR',
        countryCode: 'LB',
        status: 'inactive',
      });
    expect(languageInactive.status).toBe(201);
    inactiveIds.language = Number(languageInactive.body.id);
    languageIds.push(inactiveIds.language);
  });

  it('lists only active records when status=active', async () => {
    const [currenciesRes, taxesRes, paymentRes, locationsRes, inboundRes, vendorsRes, languagesRes] =
      await Promise.all([
        request(app)
          .get('/api/v1/admin/currencies')
          .query({ limit: 100, status: 'active' })
          .set('Authorization', `Bearer ${accessToken}`),
        request(app)
          .get('/api/v1/admin/taxes')
          .query({ limit: 100, status: 'active' })
          .set('Authorization', `Bearer ${accessToken}`),
        request(app)
          .get('/api/v1/admin/payment-methods')
          .query({ limit: 100, status: 'active' })
          .set('Authorization', `Bearer ${accessToken}`),
        request(app)
          .get('/api/v1/admin/stock-locations')
          .query({ limit: 100, status: 'active' })
          .set('Authorization', `Bearer ${accessToken}`),
        request(app)
          .get('/api/v1/admin/inbound-shipping-methods')
          .query({ limit: 100, status: 'active' })
          .set('Authorization', `Bearer ${accessToken}`),
        request(app)
          .get('/api/v1/admin/vendors')
          .query({ limit: 100, status: 'active' })
          .set('Authorization', `Bearer ${accessToken}`),
        request(app)
          .get('/api/v1/admin/languages')
          .query({ limit: 100, status: 'active' })
          .set('Authorization', `Bearer ${accessToken}`),
      ]);

    const activeChecks = [
      { res: currenciesRes, active: activeIds.currency, inactive: inactiveIds.currency },
      { res: taxesRes, active: activeIds.tax, inactive: inactiveIds.tax },
      { res: paymentRes, active: activeIds.paymentMethod, inactive: inactiveIds.paymentMethod },
      { res: locationsRes, active: activeIds.stockLocation, inactive: inactiveIds.stockLocation },
      { res: inboundRes, active: activeIds.inboundShipping, inactive: inactiveIds.inboundShipping },
      { res: vendorsRes, active: activeIds.vendor, inactive: inactiveIds.vendor },
      { res: languagesRes, active: activeIds.language, inactive: inactiveIds.language },
    ];

    for (const { res, active, inactive } of activeChecks) {
      expect(res.status).toBe(200);
      const items = res.body?.items ?? res.body;
      const ids = (items ?? []).map((item: { id: number }) => item.id);
      expect(ids).toContain(active);
      expect(ids).not.toContain(inactive);
    }
  });

  it('lists only inactive records when status=inactive', async () => {
    const [currenciesRes, taxesRes, paymentRes, locationsRes, inboundRes, vendorsRes, languagesRes] =
      await Promise.all([
        request(app)
          .get('/api/v1/admin/currencies')
          .query({ limit: 100, status: 'inactive' })
          .set('Authorization', `Bearer ${accessToken}`),
        request(app)
          .get('/api/v1/admin/taxes')
          .query({ limit: 100, status: 'inactive' })
          .set('Authorization', `Bearer ${accessToken}`),
        request(app)
          .get('/api/v1/admin/payment-methods')
          .query({ limit: 100, status: 'inactive' })
          .set('Authorization', `Bearer ${accessToken}`),
        request(app)
          .get('/api/v1/admin/stock-locations')
          .query({ limit: 100, status: 'inactive' })
          .set('Authorization', `Bearer ${accessToken}`),
        request(app)
          .get('/api/v1/admin/inbound-shipping-methods')
          .query({ limit: 100, status: 'inactive' })
          .set('Authorization', `Bearer ${accessToken}`),
        request(app)
          .get('/api/v1/admin/vendors')
          .query({ limit: 100, status: 'inactive' })
          .set('Authorization', `Bearer ${accessToken}`),
        request(app)
          .get('/api/v1/admin/languages')
          .query({ limit: 100, status: 'inactive' })
          .set('Authorization', `Bearer ${accessToken}`),
      ]);

    const inactiveChecks = [
      { res: currenciesRes, active: activeIds.currency, inactive: inactiveIds.currency },
      { res: taxesRes, active: activeIds.tax, inactive: inactiveIds.tax },
      { res: paymentRes, active: activeIds.paymentMethod, inactive: inactiveIds.paymentMethod },
      { res: locationsRes, active: activeIds.stockLocation, inactive: inactiveIds.stockLocation },
      { res: inboundRes, active: activeIds.inboundShipping, inactive: inactiveIds.inboundShipping },
      { res: vendorsRes, active: activeIds.vendor, inactive: inactiveIds.vendor },
      { res: languagesRes, active: activeIds.language, inactive: inactiveIds.language },
    ];

    for (const { res, active, inactive } of inactiveChecks) {
      expect(res.status).toBe(200);
      const items = res.body?.items ?? res.body;
      const ids = (items ?? []).map((item: { id: number }) => item.id);
      expect(ids).toContain(inactive);
      expect(ids).not.toContain(active);
    }
  });
});
