import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { roles, users } from '@milemoto/types';
import { z } from 'zod';
import { db } from '../../db/drizzle.js';
import { sendNewVerificationEmail, Register } from '../../routes/helpers/auth.helpers.js';
import { httpError } from '../../utils/error.js';
import { sha256 } from '../../utils/crypto.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { logger } from '../../utils/logger.js';
import type { RegisterResponseDto } from '@milemoto/types';

export async function register(data: z.infer<typeof Register>) {
  const { fullName, email, phone, password } = data;
  const hash = await argon2.hash(password, { type: argon2.argon2id });

  try {
    const [roleRow] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, 'Customer'))
      .limit(1);
    const customerRoleId = roleRow?.id ?? null;

    const inserted = await db
      .insert(users)
      .values({
        fullName,
        email: email.toLowerCase(),
        phone: phone ?? null,
        passwordHash: hash,
        role: 'user',
        roleId: customerRoleId,
        status: 'active',
      })
      .$returningId();

    const userId = inserted[0]?.id ? Number(inserted[0].id) : undefined;
    if (!userId) {
      throw httpError(500, 'InsertFailed', 'Failed to create user');
    }

    try {
      await sendNewVerificationEmail(String(userId), email);
    } catch (emailError: unknown) {
      logger.error(
        { err: emailError, emailHash: sha256(email.toLowerCase()) },
        'Failed to send verification email'
      );
    }
    return { ok: true, userId: userId } as RegisterResponseDto;
  } catch (e: unknown) {
    if (isDuplicateEntryError(e)) {
      const error = e as { message?: string };
      if (error.message && error.message.includes('uniqUsersPhone')) {
        throw httpError(409, 'ER_DUP_PHONE', 'Phone number already registered');
      }

      throw httpError(409, 'ER_DUP_EMAIL', 'Email address already registered');
    }
    throw e;
  }
}
