import { sql } from 'drizzle-orm';
import { env } from './env.js';
import { runtimeflags } from '@milemoto/types';
import { db } from '../db/drizzle.js';
import { logger } from '../utils/logger.js';

type FlagKey = 'trustedDeviceFpEnforceAll' | 'installed';

const defaults: Record<FlagKey, boolean> = {
  trustedDeviceFpEnforceAll: env.TRUSTED_DEVICE_FINGERPRINT_ENABLED,
  installed: false,
};

// Mutable runtime flags that can be flipped without redeploy via admin endpoints
export const runtimeFlags: Record<FlagKey, boolean> = { ...defaults };

export async function loadRuntimeFlags(): Promise<void> {
  try {
    const rows = await db
      .select({ flagKey: runtimeflags.flagKey, boolValue: runtimeflags.boolValue })
      .from(runtimeflags);
    for (const row of rows) {
      const key = row.flagKey as FlagKey;
      if (key && key in runtimeFlags) {
        runtimeFlags[key] = Boolean(row.boolValue);
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to load runtime flags; using defaults');
  }
}

export async function persistRuntimeFlag(key: FlagKey, value: boolean): Promise<void> {
  await db
    .insert(runtimeflags)
    .values({ flagKey: key, boolValue: value })
    .onDuplicateKeyUpdate({
      set: {
        boolValue: value,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
  runtimeFlags[key] = value;
}
