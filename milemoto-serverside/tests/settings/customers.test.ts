import argon2 from 'argon2';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { inArray } from 'drizzle-orm';
import { app } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { permissions, rolepermissions, roles, users } from '@milemoto/types';
import { ensureEmailVerifiedAtNullable } from '../auth/helpers.js';

const createdPermissionIds: number[] = [];
const createdRoleIds: number[] = [];
const createdUserIds: number[] = [];

let accessToken = '';
let customerId = 0;

async function ensurePermission(seed: { slug: string; description: string; resourceGroup: string }) {
  const [existing] = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(inArray(permissions.slug, [seed.slug]))
    .limit(1);
  if (existing?.id) {
    return { id: Number(existing.id), created: false };
  }

  const inserted = await db
    .insert(permissions)
    .values({
      slug: seed.slug,
      description: seed.description,
      resourceGroup: seed.resourceGroup,
    })
    .$returningId();
  const id = inserted[0]?.id ? Number(inserted[0].id) : NaN;
  if (!Number.isFinite(id)) throw new Error('Failed to seed permission');
  return { id, created: true };
}

async function createAdminUser(params: { email: string; password: string; roleId: number }) {
  const hash = await argon2.hash(params.password, { type: argon2.argon2id });
  const inserted = await db
    .insert(users)
    .values({
      fullName: 'Customer Test Admin',
      email: params.email.toLowerCase(),
      passwordHash: hash,
      role: 'admin',
      roleId: params.roleId,
      status: 'active',
      emailVerifiedAt: new Date(),
    })
    .$returningId();
  const id = inserted[0]?.id ? Number(inserted[0].id) : NaN;
  if (!Number.isFinite(id)) throw new Error('Failed to create admin user');
  return { id, email: params.email, password: params.password };
}

beforeAll(async () => {
  await ensureEmailVerifiedAtNullable();

  const readPerm = await ensurePermission({
    slug: 'customers.read',
    description: 'View customers',
    resourceGroup: 'Customers',
  });
  const managePerm = await ensurePermission({
    slug: 'customers.manage',
    description: 'Manage customers',
    resourceGroup: 'Customers',
  });
  if (readPerm.created) createdPermissionIds.push(readPerm.id);
  if (managePerm.created) createdPermissionIds.push(managePerm.id);

  const roleInsert = await db
    .insert(roles)
    .values({
      name: `Customers Admin ${Date.now()}`,
      description: null,
      isSystem: false,
    })
    .$returningId();
  const roleId = roleInsert[0]?.id ? Number(roleInsert[0].id) : NaN;
  if (!Number.isFinite(roleId)) throw new Error('Failed to create role');
  createdRoleIds.push(roleId);

  await db.insert(rolepermissions).values([
    { roleId, permissionId: readPerm.id },
    { roleId, permissionId: managePerm.id },
  ]);

  const admin = await createAdminUser({
    email: `customers-admin-${Date.now()}@milemoto.local`,
    password: 'Password123!',
    roleId,
  });
  createdUserIds.push(admin.id);

  const loginRes = await request(app).post('/api/v1/auth/login').send({
    identifier: admin.email,
    password: admin.password,
    remember: false,
  });
  accessToken = loginRes.body?.accessToken ?? '';
  if (!accessToken) throw new Error('Missing access token');

  const customerInsert = await db
    .insert(users)
    .values({
      fullName: 'Customer Test',
      email: `customer-${Date.now()}@milemoto.local`,
      passwordHash: await argon2.hash('Password123!', { type: argon2.argon2id }),
      role: 'user',
      roleId: null,
      status: 'active',
      emailVerifiedAt: new Date(),
      phone: '+96170000000',
    })
    .$returningId();
  customerId = customerInsert[0]?.id ? Number(customerInsert[0].id) : 0;
  if (!customerId) throw new Error('Failed to create customer');
  createdUserIds.push(customerId);
});

afterAll(async () => {
  if (createdUserIds.length) {
    await db.delete(users).where(inArray(users.id, createdUserIds));
  }
  if (createdRoleIds.length) {
    await db.delete(rolepermissions).where(inArray(rolepermissions.roleId, createdRoleIds));
    await db.delete(roles).where(inArray(roles.id, createdRoleIds));
  }
  if (createdPermissionIds.length) {
    await db.delete(permissions).where(inArray(permissions.id, createdPermissionIds));
  }
});

describe('settings customers', () => {
  it('lists customers with filters', async () => {
    const res = await request(app)
      .get('/api/v1/admin/customers')
      .query({ page: 1, limit: 10, search: 'Customer Test', status: 'active' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const items = res.body?.items ?? res.body;
    const ids = (items ?? []).map((c: { id: string | number }) => Number(c.id));
    expect(ids).toContain(customerId);
  });

  it('gets a customer by id', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/customers/${customerId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Number(res.body?.id)).toBe(customerId);
  });

  it('updates a customer status', async () => {
    const res = await request(app)
      .put(`/api/v1/admin/customers/${customerId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body?.status).toBe('inactive');
  });
});
