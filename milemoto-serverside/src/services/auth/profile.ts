import { and, eq, gt, isNull } from 'drizzle-orm';
import type { UpdateUserAddressDto } from '@milemoto/types';
import { emailverifications, phoneverifications, users } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { toUserId } from './shared.js';

export async function getUserProfile(userId: string) {
  const userIdNum = toUserId(userId);

  const [u] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      mfaEnabled: users.mfaEnabled,
      phoneVerifiedAt: users.phoneVerifiedAt,
      defaultShippingFullName: users.defaultShippingFullName,
      defaultShippingPhone: users.defaultShippingPhone,
      defaultShippingEmail: users.defaultShippingEmail,
      defaultShippingCountry: users.defaultShippingCountry,
      defaultShippingCountryId: users.defaultShippingCountryId,
      defaultShippingState: users.defaultShippingState,
      defaultShippingStateId: users.defaultShippingStateId,
      defaultShippingCity: users.defaultShippingCity,
      defaultShippingCityId: users.defaultShippingCityId,
      defaultShippingAddressLine1: users.defaultShippingAddressLine1,
      defaultShippingAddressLine2: users.defaultShippingAddressLine2,
      defaultShippingPostalCode: users.defaultShippingPostalCode,
      pendingEmail: emailverifications.email,
    })
    .from(users)
    .leftJoin(
      emailverifications,
      and(
        eq(emailverifications.userId, users.id),
        isNull(emailverifications.usedAt),
        gt(emailverifications.expiresAt, new Date())
      )
    )
    .where(eq(users.id, userIdNum))
    .limit(1);
  if (!u) throw httpError(404, 'UserNotFound', 'User not found');

  return {
    id: String(u.id),
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    pendingEmail: u.pendingEmail ?? null,
    role: u.role,
    status: u.status,
    mfaEnabled: Boolean(u.mfaEnabled),
    phoneVerifiedAt: u.phoneVerifiedAt
      ? u.phoneVerifiedAt instanceof Date
        ? u.phoneVerifiedAt.toISOString()
        : String(u.phoneVerifiedAt)
      : null,
    defaultShippingAddress:
      u.defaultShippingFullName &&
      u.defaultShippingPhone &&
      u.defaultShippingCountry &&
      u.defaultShippingState &&
      u.defaultShippingCity &&
      u.defaultShippingAddressLine1
        ? {
            fullName: u.defaultShippingFullName,
            phone: u.defaultShippingPhone,
            email: u.defaultShippingEmail ?? null,
            country: u.defaultShippingCountry,
            countryId:
              u.defaultShippingCountryId == null ? null : Number(u.defaultShippingCountryId),
            state: u.defaultShippingState,
            stateId: u.defaultShippingStateId == null ? null : Number(u.defaultShippingStateId),
            city: u.defaultShippingCity,
            cityId: u.defaultShippingCityId == null ? null : Number(u.defaultShippingCityId),
            addressLine1: u.defaultShippingAddressLine1,
            addressLine2: u.defaultShippingAddressLine2 ?? null,
            postalCode: u.defaultShippingPostalCode ?? null,
          }
        : null,
  };
}

export async function updateUserProfile(
  userId: string,
  data: { fullName: string; phone?: string | null | undefined }
) {
  const userIdNum = toUserId(userId);
  const phoneVal = data.phone === undefined ? undefined : data.phone;

  const updates: Partial<typeof users.$inferInsert> = { fullName: data.fullName };
  if (phoneVal !== undefined) {
    const [current] = await db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, userIdNum))
      .limit(1);
    const prevPhone = current?.phone ?? null;
    const nextPhone = phoneVal ?? null;
    if (prevPhone !== nextPhone) {
      updates.phoneVerifiedAt = null;
      await db.delete(phoneverifications).where(eq(phoneverifications.userId, userIdNum));
    }
    updates.phone = phoneVal;
  }

  await db.update(users).set(updates).where(eq(users.id, userIdNum));

  return getUserProfile(userId);
}

export async function updateUserDefaultShippingAddress(userId: string, data: UpdateUserAddressDto) {
  const userIdNum = toUserId(userId);
  await db
    .update(users)
    .set({
      defaultShippingFullName: data.fullName,
      defaultShippingPhone: data.phone,
      defaultShippingEmail: data.email ?? null,
      defaultShippingCountry: data.country,
      defaultShippingCountryId: data.countryId ?? null,
      defaultShippingState: data.state,
      defaultShippingStateId: data.stateId ?? null,
      defaultShippingCity: data.city,
      defaultShippingCityId: data.cityId ?? null,
      defaultShippingAddressLine1: data.addressLine1,
      defaultShippingAddressLine2: data.addressLine2 ?? null,
      defaultShippingPostalCode: data.postalCode ?? null,
    })
    .where(eq(users.id, userIdNum));

  return getUserProfile(userId);
}
