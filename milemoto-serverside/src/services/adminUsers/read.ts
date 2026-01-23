import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import { roles, users } from '@milemoto/types';
import type { UserResponse } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { mapUser, userFields, type UserRow } from './shared.js';

export async function listUsers(search?: string): Promise<UserResponse[]> {
  const filters = [
    search ? or(like(users.fullName, `%${search}%`), like(users.email, `%${search}%`)) : undefined,
    sql`(${roles.name} != 'Customer' OR ${roles.name} IS NULL)`,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      ...userFields,
      roleName: roles.name,
    })
    .from(users)
    .leftJoin(roles, eq(roles.id, users.roleId))
    .where(where)
    .orderBy(desc(users.createdAt));

  return rows.map((r) => mapUser(r as UserRow));
}

export async function getUser(id: number): Promise<UserResponse | null> {
  const [row] = await db
    .select({
      ...userFields,
      roleName: roles.name,
    })
    .from(users)
    .leftJoin(roles, eq(roles.id, users.roleId))
    .where(eq(users.id, id))
    .limit(1);

  if (!row) return null;

  return mapUser(row as UserRow);
}
