import { and, eq, ne } from 'drizzle-orm';
import { users } from '@milemoto/types';
import { httpError } from '../../utils/error.js';
import { db } from '../../db/drizzle.js';
import { getCustomer } from './read.js';

export async function updateCustomer(
  id: string,
  data: { status: 'active' | 'inactive' | 'blocked' }
) {
  const { status } = data;

  const result = await db
    .update(users)
    .set({ status })
    .where(and(eq(users.id, Number(id)), ne(users.role, 'admin')));

  const affected =
    'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
  if (!affected) {
    const [exists] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, Number(id)), ne(users.role, 'admin')))
      .limit(1);
    if (!exists) {
      throw httpError(404, 'NotFound', 'Customer not found');
    }
  }

  return getCustomer(id);
}
