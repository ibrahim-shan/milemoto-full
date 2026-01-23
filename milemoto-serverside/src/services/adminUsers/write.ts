import { eq } from 'drizzle-orm';
import { roles, users } from '@milemoto/types';
import type { CreateUserDto, UpdateUserDto, UserResponse } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import {
  handleDbError,
  mapUser,
  userFields,
  type UserRow,
  buildInsertUserRow,
  buildUpdateUserRow,
} from './shared.js';
import { getUser } from './read.js';

export async function createUser(data: CreateUserDto): Promise<UserResponse | null | undefined> {
  try {
    const { insertData, email } = await buildInsertUserRow(data);
    const result = await db.insert(users).values(insertData);

    const insertId =
      'insertId' in result
        ? Number((result as unknown as { insertId: number }).insertId)
        : undefined;

    if (insertId) {
      return getUser(insertId);
    }

    const [created] = await db
      .select({
        ...userFields,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(roles.id, users.roleId))
      .where(eq(users.email, email))
      .limit(1);

    return created ? mapUser(created as UserRow) : null;
  } catch (err) {
    handleDbError(err);
  }
}

export async function updateUser(
  id: number,
  data: UpdateUserDto
): Promise<UserResponse | null | undefined> {
  const current = await getUser(id);
  if (!current) throw httpError(404, 'NotFound', 'User not found');

  try {
    const { updates } = await buildUpdateUserRow(current, data);
    if (Object.keys(updates).length === 0) return current;

    await db.update(users).set(updates).where(eq(users.id, id));
    return getUser(id);
  } catch (err) {
    handleDbError(err);
  }
}

export async function deleteUser(id: number) {
  const current = await getUser(id);
  if (!current) throw httpError(404, 'NotFound', 'User not found');
  if (current.roleName === 'Super Admin') {
    throw httpError(403, 'Forbidden', 'Cannot delete Super Admin user');
  }
  await db.delete(users).where(eq(users.id, id));
}
