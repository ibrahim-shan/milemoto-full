import { sitesettings } from '@milemoto/types';
import { eq } from 'drizzle-orm';
import { db } from '../../db/drizzle.js';

export async function getSetting(key: string): Promise<string | null> {
  const rows = await db
    .select({ settingValue: sitesettings.settingValue })
    .from(sitesettings)
    .where(eq(sitesettings.settingKey, key))
    .limit(1);
  return rows[0]?.settingValue ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(sitesettings)
    .values({ settingKey: key, settingValue: value })
    .onDuplicateKeyUpdate({
      set: { settingValue: value },
    });
}

export function parseSettingBool(value: string | null, fallback: boolean) {
  if (value === null) return fallback;
  return value === 'true' || value === '1';
}
