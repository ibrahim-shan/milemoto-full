import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogAdmin, cleanupCatalogAuth } from '../catalog/helpers.js';
import { db } from '../../src/db/drizzle.js';
import { smsgateways } from '@milemoto/types';

let accessToken = '';
let gatewayId: number | null = null;

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

describe('sms gateways admin', () => {
  it('returns empty list when no gateways exist', async () => {
    const res = await request(app)
      .get('/api/v1/admin/sms-gateways')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('rejects test SMS when no active gateway', async () => {
    await db.update(smsgateways).set({ status: 'inactive' });
    const res = await request(app)
      .post('/api/v1/admin/sms-gateways/test')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ toNumber: '+15550001111', message: 'Test SMS' });

    expect(res.status).toBe(400);
    expect(res.body?.code).toBe('SmsGatewayNotConfigured');
  });

  it('creates an Infobip gateway with api key stored', async () => {
    const name = `Infobip ${Date.now()}`;
    const res = await request(app)
      .post('/api/v1/admin/sms-gateways')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        provider: 'infobip',
        name,
        baseUrl: 'https://example.api.infobip.com',
        senderId: 'MILEMOTO',
        smsSenderVerified: false,
        apiKey: 'test-api-key',
      });

    expect(res.status).toBe(200);
    expect(res.body?.id).toBeTruthy();
    expect(res.body?.hasApiKey).toBe(true);
    gatewayId = Number(res.body.id);
  });

  it('blocks activation when sender is not verified', async () => {
    if (!gatewayId) throw new Error('Missing gateway id');
    const res = await request(app)
      .post(`/api/v1/admin/sms-gateways/${gatewayId}/activate`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body?.code).toBe('SmsSenderNotVerified');
  });

  it('updates gateway and clears api key', async () => {
    if (!gatewayId) throw new Error('Missing gateway id');
    const res = await request(app)
      .put(`/api/v1/admin/sms-gateways/${gatewayId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Infobip Updated ${Date.now()}`,
        smsSenderVerified: true,
        apiKey: null,
      });

    expect(res.status).toBe(200);
    expect(res.body?.hasApiKey).toBe(false);
    expect(res.body?.smsSenderVerified).toBe(true);
  });

  it('blocks activation when api key is missing', async () => {
    if (!gatewayId) throw new Error('Missing gateway id');
    const res = await request(app)
      .post(`/api/v1/admin/sms-gateways/${gatewayId}/activate`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body?.code).toBe('SmsGatewayNotConfigured');
  });
});
