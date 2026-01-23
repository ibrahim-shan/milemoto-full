import { eq } from 'drizzle-orm';
import { mailsettings } from '@milemoto/types';
import type { MailSettingsResponseDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';

export const MAIL_SETTINGS_SINGLETON_ID = 1;

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value ?? '');
}

export async function ensureMailSettingsRow() {
  const [row] = await db
    .select()
    .from(mailsettings)
    .where(eq(mailsettings.id, MAIL_SETTINGS_SINGLETON_ID))
    .limit(1);
  if (row) return row;

  // Seed a minimal row if missing (fresh DB).
  await db.insert(mailsettings).values({
    id: MAIL_SETTINGS_SINGLETON_ID,
    host: null,
    port: null,
    username: null,
    passwordEnc: null,
    encryption: 'tls',
    fromName: null,
    fromEmail: null,
  });
  const [created] = await db
    .select()
    .from(mailsettings)
    .where(eq(mailsettings.id, MAIL_SETTINGS_SINGLETON_ID))
    .limit(1);
  if (!created) throw httpError(500, 'InsertFailed', 'Failed to initialize mail settings');
  return created;
}

export function formatMailSettingsRow(
  row: typeof mailsettings.$inferSelect
): MailSettingsResponseDto {
  return {
    id: Number(row.id),
    host: row.host ?? null,
    port: row.port !== null && row.port !== undefined ? Number(row.port) : null,
    username: row.username ?? null,
    encryption: row.encryption as MailSettingsResponseDto['encryption'],
    fromName: row.fromName ?? null,
    fromEmail: row.fromEmail ?? null,
    hasPassword: Boolean(row.passwordEnc),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}
