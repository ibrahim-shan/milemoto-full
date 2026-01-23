import type { Express } from 'express';
import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

let app: Express;
let accessToken = '';
let cleanupCatalogAuth: ((params: {
  userIds: number[];
  roleIds: number[];
  permissionIds: number[];
}) => Promise<void>) | null = null;

const authCleanup = { userIds: [] as number[], roleIds: [] as number[], permissionIds: [] as number[] };

function signPayload(secret: string, payload: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

beforeAll(async () => {
  process.env.INFOBIP_WEBHOOK_SECRET = process.env.INFOBIP_WEBHOOK_SECRET || 'test-secret';

  const appModule = await import('../../src/app.js');
  app = appModule.app;
  const helpers = await import('../catalog/helpers.js');
  const createCatalogAdmin = helpers.createCatalogAdmin;
  cleanupCatalogAuth = helpers.cleanupCatalogAuth;

  const admin = await createCatalogAdmin([
    { slug: 'settings.read', description: 'View settings', resourceGroup: 'Settings' },
  ]);
  accessToken = admin.accessToken;
  authCleanup.userIds.push(admin.userId);
  authCleanup.roleIds.push(admin.roleId);
  authCleanup.permissionIds.push(...admin.createdPermissionIds);

});

afterAll(async () => {
  if (cleanupCatalogAuth) {
    await cleanupCatalogAuth(authCleanup);
  }
});

describe('sms delivery reports', () => {
  it('stores delivery report via webhook and exposes it in list', async () => {
    const payload = {
      results: [
        {
          messageId: `msg-${Date.now()}`,
          to: '+15550001111',
          status: {
            groupName: 'DELIVERED',
            name: 'DELIVERED_TO_HANDSET',
            description: 'Delivered to handset',
          },
          error: { name: 'NO_ERROR', description: 'No Error (code: 0)' },
          sentAt: new Date().toISOString(),
          doneAt: new Date().toISOString(),
        },
      ],
    };
    const raw = JSON.stringify(payload);
    const secret = process.env.INFOBIP_WEBHOOK_SECRET || 'test-secret';
    const signature = signPayload(secret, raw);

    const webhookRes = await request(app)
      .post('/api/v1/webhooks/infobip/sms/delivery')
      .set('x-infobip-signature-256', `sha256=${signature}`)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body?.ok).toBe(true);

    const listRes = await request(app)
      .get('/api/v1/admin/sms-gateways/delivery-reports')
      .query({ limit: 10 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(listRes.status).toBe(200);
    const items = Array.isArray(listRes.body) ? listRes.body : listRes.body?.items;
    const first = payload.results[0];
    expect(first).toBeTruthy();
    const found = (items ?? []).find(
      (row: { messageId: string }) => row.messageId === first!.messageId
    );
    expect(found).toBeTruthy();
    expect(found?.statusName).toBe(first!.status.name);
  });

  it('rejects webhook with missing signature', async () => {
    const res = await request(app).post('/api/v1/webhooks/infobip/sms/delivery').send({});
    expect(res.status).toBe(401);
    expect(res.body?.code).toBe('WebhookSignatureMissing');
  });

  it('rejects webhook with invalid signature', async () => {
    const payload = { results: [{ messageId: 'msg-bad', to: '+15550002222' }] };
    const res = await request(app)
      .post('/api/v1/webhooks/infobip/sms/delivery')
      .set('x-infobip-signature-256', 'sha256=deadbeef')
      .send(payload);
    expect(res.status).toBe(401);
    expect(res.body?.code).toBe('WebhookSignatureInvalid');
  });

  it('rejects empty delivery report payload', async () => {
    const payload = { results: [] };
    const raw = JSON.stringify(payload);
    const secret = process.env.INFOBIP_WEBHOOK_SECRET || 'test-secret';
    const signature = signPayload(secret, raw);

    const res = await request(app)
      .post('/api/v1/webhooks/infobip/sms/delivery')
      .set('x-infobip-signature-256', `sha256=${signature}`)
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body?.code).toBe('InvalidPayload');
  });
});
