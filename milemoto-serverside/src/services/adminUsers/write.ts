import { eq } from 'drizzle-orm';
import { roles, users } from '@milemoto/types';
import type { CreateUserDto, UpdateUserDto, UserResponse } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { logAuditEvent } from '../auditLog.service.js';
import {
  handleDbError,
  mapUser,
  userFields,
  type UserRow,
  buildInsertUserRow,
  buildUpdateUserRow,
} from './shared.js';
import { getUser } from './read.js';

export interface AuditContext {
  userId: number;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export async function createUser(
  data: CreateUserDto,
  audit?: AuditContext
): Promise<UserResponse | null | undefined> {
  try {
    const { insertData, email } = await buildInsertUserRow(data);
    const result = await db.insert(users).values(insertData);

    const insertId =
      'insertId' in result
        ? Number((result as unknown as { insertId: number }).insertId)
        : undefined;

    let created: UserResponse | null = null;

    if (insertId) {
      created = (await getUser(insertId)) ?? null;
    } else {
      const [row] = await db
        .select({
          ...userFields,
          roleName: roles.name,
        })
        .from(users)
        .leftJoin(roles, eq(roles.id, users.roleId))
        .where(eq(users.email, email))
        .limit(1);
      created = row ? mapUser(row as UserRow) : null;
    }

    // Audit log
    if (audit && created) {
      void logAuditEvent({
        userId: audit.userId,
        action: 'create',
        entityType: 'users',
        entityId: String(created.id),
        metadata: { email: created.email, roleId: data.roleId },
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
      });
    }

    return created;
  } catch (err) {
    handleDbError(err);
  }
}

export async function updateUser(
  id: number,
  data: UpdateUserDto,
  audit?: AuditContext
): Promise<UserResponse | null | undefined> {
  const current = await getUser(id);
  if (!current) throw httpError(404, 'NotFound', 'User not found');

  try {
    const { updates } = await buildUpdateUserRow(current, data);
    if (Object.keys(updates).length === 0) return current;

    await db.update(users).set(updates).where(eq(users.id, id));
    const updated = await getUser(id);

    // Audit log
    if (audit) {
      void logAuditEvent({
        userId: audit.userId,
        action: 'update',
        entityType: 'users',
        entityId: String(id),
        metadata: { before: current, after: data },
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
      });
    }

    return updated;
  } catch (err) {
    handleDbError(err);
  }
}

export async function deleteUser(id: number, audit?: AuditContext) {
  const current = await getUser(id);
  if (!current) throw httpError(404, 'NotFound', 'User not found');
  if (current.roleName === 'Super Admin') {
    throw httpError(403, 'Forbidden', 'Cannot delete Super Admin user');
  }
  await db.delete(users).where(eq(users.id, id));

  // Audit log
  if (audit) {
    void logAuditEvent({
      userId: audit.userId,
      action: 'delete',
      entityType: 'users',
      entityId: String(id),
      metadata: {
        deleted: { email: current.email, fullName: current.fullName },
      },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }
}
