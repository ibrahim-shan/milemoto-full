import argon2 from 'argon2';
import { and, eq, or, sql } from 'drizzle-orm';
import { roles, users } from '@milemoto/types';
import type { CreateUserDto, UpdateUserDto, UserResponse } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';

export const userFields = {
  id: users.id,
  email: users.email,
  username: users.username,
  fullName: users.fullName,
  phone: users.phone,
  status: users.status,
  passwordHash: users.passwordHash,
  role: users.role,
  mfaEnabled: users.mfaEnabled,
  mfaSecretEnc: users.mfaSecretEnc,
  googleSub: users.googleSub,
  emailVerifiedAt: users.emailVerifiedAt,
  phoneVerifiedAt: users.phoneVerifiedAt,
  defaultShippingFullName: users.defaultShippingFullName,
  defaultShippingPhone: users.defaultShippingPhone,
  defaultShippingEmail: users.defaultShippingEmail,
  defaultShippingCountry: users.defaultShippingCountry,
  defaultShippingCountryId: users.defaultShippingCountryId,
  defaultShippingState: users.defaultShippingState,
  defaultShippingStateId: users.defaultShippingStateId,
  defaultShippingCity: users.defaultShippingCity,
  defaultShippingCityId: users.defaultShippingCityId,
  defaultShippingAddressLine1: users.defaultShippingAddressLine1,
  defaultShippingAddressLine2: users.defaultShippingAddressLine2,
  defaultShippingPostalCode: users.defaultShippingPostalCode,
  roleId: users.roleId,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export type UserRow = {
  roleName?: string | null;
} & {
  [K in keyof typeof userFields]: (typeof userFields)[K]['_']['data'];
};

export function mapUser(row: UserRow): UserResponse {
  const normalizedStatus: UserResponse['status'] =
    row.status === 'active' || row.status === 'inactive' || row.status === 'blocked'
      ? row.status
      : 'inactive';
  return {
    id: Number(row.id),
    email: row.email,
    username: row.username ?? null,
    fullName: row.fullName,
    phone: row.phone ?? null,
    status: normalizedStatus,
    passwordHash: row.passwordHash,
    role: row.role as 'user' | 'admin',
    mfaEnabled: Boolean(row.mfaEnabled),
    mfaSecretEnc: row.mfaSecretEnc ?? null,
    googleSub: row.googleSub ?? null,
    defaultShippingFullName: row.defaultShippingFullName ?? null,
    defaultShippingPhone: row.defaultShippingPhone ?? null,
    defaultShippingEmail: row.defaultShippingEmail ?? null,
    defaultShippingCountry: row.defaultShippingCountry ?? null,
    defaultShippingCountryId: row.defaultShippingCountryId ?? null,
    defaultShippingState: row.defaultShippingState ?? null,
    defaultShippingStateId: row.defaultShippingStateId ?? null,
    defaultShippingCity: row.defaultShippingCity ?? null,
    defaultShippingCityId: row.defaultShippingCityId ?? null,
    defaultShippingAddressLine1: row.defaultShippingAddressLine1 ?? null,
    defaultShippingAddressLine2: row.defaultShippingAddressLine2 ?? null,
    defaultShippingPostalCode: row.defaultShippingPostalCode ?? null,
    emailVerifiedAt: row.emailVerifiedAt
      ? row.emailVerifiedAt instanceof Date
        ? row.emailVerifiedAt
        : new Date(row.emailVerifiedAt)
      : null,
    phoneVerifiedAt: row.phoneVerifiedAt
      ? row.phoneVerifiedAt instanceof Date
        ? row.phoneVerifiedAt
        : new Date(row.phoneVerifiedAt)
      : null,
    roleId: row.roleId ?? null,
    roleName: row.roleName ?? '',
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export function handleDbError(err: unknown) {
  if (isDuplicateEntryError(err)) {
    const message = (err as { message?: string }).message || '';
    if (message.includes('users.email') || message.includes('email')) {
      throw httpError(409, 'Conflict', 'Email address is already in use.');
    }
    if (message.includes('users.username') || message.includes('username')) {
      throw httpError(409, 'Conflict', 'Username is already taken.');
    }
    if (
      message.includes('users.phone') ||
      message.includes('phone') ||
      message.includes('uniqUsersPhone')
    ) {
      throw httpError(409, 'Conflict', 'Phone number is already in use.');
    }
    throw httpError(409, 'Conflict', 'Duplicate entry detected.');
  }
  throw err;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeString(value: string): string {
  return value.trim();
}

export async function assertNoUserConflicts(options: {
  email?: string;
  username?: string | null;
  phone?: string | null;
  excludeUserId?: number;
}) {
  const email = options.email ? normalizeEmail(options.email) : undefined;
  const username = options.username ? normalizeString(options.username) : null;
  const phone = options.phone ? normalizeString(options.phone) : null;

  const conditions = [
    email ? eq(users.email, email) : undefined,
    username ? eq(users.username, username) : undefined,
    phone ? eq(users.phone, phone) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof eq>>[];

  if (conditions.length === 0) return;

  const where = options.excludeUserId
    ? and(or(...conditions), sql`${users.id} != ${options.excludeUserId}`)
    : or(...conditions);

  const rows = await db
    .select({ id: users.id, email: users.email, username: users.username, phone: users.phone })
    .from(users)
    .where(where)
    .limit(5);

  if (rows.length === 0) return;

  const emailTaken = email ? rows.some((r) => r.email === email) : false;
  const usernameTaken = username ? rows.some((r) => r.username === username) : false;
  const phoneTaken = phone ? rows.some((r) => r.phone === phone) : false;

  if (emailTaken && phoneTaken) {
    throw httpError(409, 'Conflict', 'Email address and phone number are already in use.');
  }
  if (emailTaken) {
    throw httpError(409, 'Conflict', 'Email address is already in use.');
  }
  if (phoneTaken) {
    throw httpError(409, 'Conflict', 'Phone number is already in use.');
  }
  if (usernameTaken) {
    throw httpError(409, 'Conflict', 'Username is already taken.');
  }

  throw httpError(409, 'Conflict', 'User details are already in use.');
}

export async function determineLegacyRole(roleId: number | null): Promise<'admin' | 'user'> {
  if (!roleId) return 'user';
  const [row] = await db
    .select({ name: roles.name })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);
  if (!row) return 'user';
  return row.name === 'Customer' ? 'user' : 'admin';
}

export async function buildInsertUserRow(data: CreateUserDto) {
  if (!data.password) throw new Error('Password is required');

  const email = normalizeEmail(data.email);
  const username = data.username ? normalizeString(data.username) : null;
  const phone = data.phone ? normalizeString(data.phone) : null;

  await assertNoUserConflicts({ email, username, phone });

  const hashedPassword = await argon2.hash(data.password);
  const legacyRole = await determineLegacyRole(data.roleId || null);
  const statusValue: 'active' | 'inactive' | 'blocked' = data.status ?? 'active';

  const insertData: typeof users.$inferInsert = {
    email,
    username,
    fullName: data.fullName,
    phone,
    passwordHash: hashedPassword,
    roleId: data.roleId ?? null,
    role: legacyRole,
    status: statusValue,
    emailVerifiedAt: new Date(),
  };

  return { insertData, email };
}

export async function buildUpdateUserRow(current: UserResponse, data: UpdateUserDto) {
  const updates: Partial<typeof users.$inferInsert> = {};
  const isSuperAdminUser = current.roleName === 'Super Admin';

  if (data.email !== undefined) updates.email = normalizeEmail(data.email);
  if (data.username !== undefined)
    updates.username = data.username ? normalizeString(data.username) : null;
  if (data.fullName !== undefined) updates.fullName = data.fullName;
  if (data.phone !== undefined) {
    const nextPhone = data.phone ? normalizeString(data.phone) : null;
    updates.phone = nextPhone;
    if (nextPhone !== current.phone) {
      updates.phoneVerifiedAt = null;
    }
  }
  if (data.status !== undefined) {
    if (isSuperAdminUser && data.status !== current.status) {
      throw httpError(403, 'Forbidden', 'Cannot change status for Super Admin user');
    }
    updates.status = data.status as 'active' | 'inactive' | 'blocked';
  }

  if (data.roleId !== undefined) {
    if (isSuperAdminUser && data.roleId !== current.roleId) {
      throw httpError(403, 'Forbidden', 'Cannot change role for Super Admin user');
    }
    updates.roleId = data.roleId;
    updates.role = await determineLegacyRole(data.roleId ?? null);
  }

  if (data.password) {
    updates.passwordHash = await argon2.hash(data.password);
  }

  if (Object.keys(updates).length === 0) return { updates };

  await assertNoUserConflicts({
    email: updates.email ?? current.email,
    username: updates.username !== undefined ? updates.username : current.username,
    phone: updates.phone !== undefined ? updates.phone : current.phone,
    excludeUserId: current.id,
  });

  return { updates };
}
