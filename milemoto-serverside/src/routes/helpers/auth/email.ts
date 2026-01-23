import { eq } from 'drizzle-orm';
import { emailverifications } from '@milemoto/types';
import { sha256, randToken } from '../../../utils/crypto.js';
import { logger } from '../../../utils/logger.js';
import { env } from '../../../config/env.js';
import { sendVerificationEmail } from '../../../services/emailService.js';
import { dbNow } from '../../../db/time.js';
import { db } from '../../../db/drizzle.js';
import { toUserId } from './ids.js';

// (Email helpers)
export async function sendNewVerificationEmail(userId: string, email: string) {
  try {
    const userIdNum = toUserId(userId);
    const token = randToken(32);
    const hash = sha256(token);
    const now = await dbNow();
    const exp = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

    await db.transaction(async (tx) => {
      await tx.delete(emailverifications).where(eq(emailverifications.userId, userIdNum));
      await tx.insert(emailverifications).values({
        userId: userIdNum,
        email: email.toLowerCase(),
        tokenHash: hash,
        expiresAt: exp,
        usedAt: null,
      });
    });

    const verifyUrl = `${env.FRONTEND_BASE_URL}/verify-email?token=${token}`;
    await sendVerificationEmail(email.toLowerCase(), verifyUrl);
  } catch (emailError: unknown) {
    logger.error(
      { err: emailError, emailHash: sha256(email.toLowerCase()) },
      'Failed to send verification email'
    );
  }
}
