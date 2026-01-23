import { or, eq } from 'drizzle-orm';
import { users } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { normalizePhone } from './utils.js';

export async function assertPhoneNotBlocked(toNumber: string) {
  const normalized = normalizePhone(toNumber);
  const stripped = normalized.startsWith('+') ? normalized.slice(1) : normalized;
  const [row] = await db
    .select({ status: users.status })
    .from(users)
    .where(or(eq(users.phone, normalized), eq(users.phone, stripped)))
    .limit(1);

  if (row?.status === 'blocked') {
    throw httpError(403, 'UserBlocked', 'This user is blocked and cannot receive SMS.');
  }
}
