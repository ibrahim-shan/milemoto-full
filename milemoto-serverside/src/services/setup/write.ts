import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { roles, users } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { persistRuntimeFlag } from '../../config/runtime.js';
import { getSetupStatus } from './read.js';

export async function initializeSetup(data: {
  fullName: string;
  email: string;
  password: string;
}): Promise<{ ok: true }> {
  const status = await getSetupStatus();
  if (status.installed) {
    throw httpError(409, 'AlreadyInstalled', 'System is already initialized');
  }

  const normalizedEmail = data.email.trim().toLowerCase();
  const normalizedName = data.fullName.trim();

  const passwordHash = await argon2.hash(data.password);

  try {
    await db.transaction(async (tx) => {
      const [roleRow] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, 'Super Admin'))
        .limit(1);

      if (!roleRow) {
        throw httpError(500, 'MissingRole', 'Super Admin role is missing; run migrations');
      }

      await tx.insert(users).values({
        fullName: normalizedName,
        email: normalizedEmail,
        username: null,
        phone: null,
        passwordHash,
        role: 'admin',
        status: 'active',
        mfaEnabled: false,
        mfaSecretEnc: null,
        emailVerifiedAt: new Date(),
        googleSub: null,
        roleId: roleRow.id,
      });
    });
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      const msg = (err as { message?: string }).message || '';
      if (msg.includes('email')) {
        throw httpError(409, 'Conflict', 'Email address is already in use');
      }
    }
    throw err;
  }

  await persistRuntimeFlag('installed', true);
  return { ok: true };
}
