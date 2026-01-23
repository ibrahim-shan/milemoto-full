import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from '../catalog/helpers.js';

let accessToken = '';
const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

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

describe('settings site settings', () => {
  it('gets and updates localization settings', async () => {
    const getRes = await request(app)
      .get('/api/v1/admin/site-settings/localization')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getRes.status).toBe(200);

    const putRes = await request(app)
      .put('/api/v1/admin/site-settings/localization')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        defaultTimezone: 'UTC',
        defaultLanguageId: 1,
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body?.dateFormat).toBe('DD/MM/YYYY');
    expect(putRes.body?.timeFormat).toBe('24h');
    expect(putRes.body?.defaultTimezone).toBe('UTC');
  });

  it('gets and updates store & currency settings', async () => {
    const getRes = await request(app)
      .get('/api/v1/admin/site-settings/store-currency')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getRes.status).toBe(200);

    const putRes = await request(app)
      .put('/api/v1/admin/site-settings/store-currency')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        defaultCurrencyId: 1,
        currencyPosition: 'before',
        decimalDigits: 2,
        copyrightText: 'MileMoto © 2025',
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body?.currencyPosition).toBe('before');
    expect(putRes.body?.decimalDigits).toBe(2);
  });

  it('gets and updates branding settings', async () => {
    const getRes = await request(app)
      .get('/api/v1/admin/site-settings/branding')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getRes.status).toBe(200);

    const putRes = await request(app)
      .put('/api/v1/admin/site-settings/branding')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        logoUrl: 'https://milemoto.local/logo.png',
        faviconUrl: 'https://milemoto.local/favicon.ico',
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body?.logoUrl).toBe('https://milemoto.local/logo.png');
    expect(putRes.body?.faviconUrl).toBe('https://milemoto.local/favicon.ico');
  });

  it('gets and updates document settings', async () => {
    const getRes = await request(app)
      .get('/api/v1/admin/site-settings/documents')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getRes.status).toBe(200);

    const putRes = await request(app)
      .put('/api/v1/admin/site-settings/documents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        purchaseOrderTerms: 'Net 30. All goods subject to inspection.',
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body?.purchaseOrderTerms).toContain('Net 30');
  });

  it('gets and updates feature toggles', async () => {
    const getRes = await request(app)
      .get('/api/v1/admin/site-settings/feature-toggles')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getRes.status).toBe(200);

    const putRes = await request(app)
      .put('/api/v1/admin/site-settings/feature-toggles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        cashOnDeliveryEnabled: true,
        onlinePaymentEnabled: true,
        languageSwitcherEnabled: false,
        phoneVerificationEnabled: true,
        emailVerificationEnabled: true,
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body?.cashOnDeliveryEnabled).toBe(true);
    expect(putRes.body?.onlinePaymentEnabled).toBe(true);
  });
});
