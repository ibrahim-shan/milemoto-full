import { eq } from 'drizzle-orm';
import { users } from '@milemoto/types';
import { runtimeFlags, persistRuntimeFlag } from '../../config/runtime.js';
import { db } from '../../db/drizzle.js';

export async function getSetupStatus(): Promise<{ installed: boolean }> {
  if (runtimeFlags.installed) return { installed: true };

  const [adminRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'admin'))
    .limit(1);
  if (adminRow) {
    await persistRuntimeFlag('installed', true);
    return { installed: true };
  }

  return { installed: false };
}
