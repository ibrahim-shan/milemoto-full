import { and, desc, eq, isNull } from 'drizzle-orm';
import { trusteddevices } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { toUserId } from './shared.js';

export async function listTrustedDevices(userId: string, currentCookie: string) {
  const userIdNum = toUserId(userId);

  const rows = await db
    .select({
      id: trusteddevices.id,
      userAgent: trusteddevices.userAgent,
      ip: trusteddevices.ip,
      createdAt: trusteddevices.createdAt,
      lastUsedAt: trusteddevices.lastUsedAt,
      expiresAt: trusteddevices.expiresAt,
      revokedAt: trusteddevices.revokedAt,
    })
    .from(trusteddevices)
    .where(eq(trusteddevices.userId, userIdNum))
    .orderBy(desc(trusteddevices.createdAt));

  const currentId = currentCookie.includes('.') ? currentCookie.split('.')[0] : '';

  const devices = rows.map((d) => ({
    id: String(d.id),
    userAgent: d.userAgent as string | null,
    ip: d.ip as string | null,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
    lastUsedAt: d.lastUsedAt ? new Date(d.lastUsedAt).toISOString() : null,
    expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : null,
    revokedAt: d.revokedAt ? new Date(d.revokedAt).toISOString() : null,
    current: String(d.id) === currentId,
  }));

  return { items: devices };
}

export async function revokeTrustedDevice(userId: string, deviceId: string) {
  const userIdNum = toUserId(userId);

  const [rec] = await db
    .select({ id: trusteddevices.id })
    .from(trusteddevices)
    .where(
      and(
        eq(trusteddevices.id, deviceId),
        eq(trusteddevices.userId, userIdNum),
        isNull(trusteddevices.revokedAt)
      )
    )
    .limit(1);
  if (!rec) throw httpError(404, 'DeviceNotFound', 'Device not found');

  await db
    .update(trusteddevices)
    .set({ revokedAt: new Date() })
    .where(eq(trusteddevices.id, deviceId));
}

export async function untrustCurrentDevice(userId: string, deviceId: string) {
  const userIdNum = toUserId(userId);
  await db
    .update(trusteddevices)
    .set({ revokedAt: new Date() })
    .where(and(eq(trusteddevices.id, deviceId), eq(trusteddevices.userId, userIdNum)));
}
