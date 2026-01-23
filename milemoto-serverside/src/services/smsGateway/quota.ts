import { and, eq } from 'drizzle-orm';
import { smsusage } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { env } from '../../config/env.js';
import { httpError } from '../../utils/error.js';
import { startOfDay } from './utils.js';

export async function enforceDailyQuota(gatewayId: number, channel: 'sms' | 'whatsapp') {
  const limit = channel === 'sms' ? env.SMS_DAILY_QUOTA_SMS : env.SMS_DAILY_QUOTA_WHATSAPP;
  if (!limit || limit <= 0) return;

  const today = startOfDay(new Date());

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(smsusage)
      .where(
        and(
          eq(smsusage.gatewayId, gatewayId),
          eq(smsusage.channel, channel),
          eq(smsusage.usageDate, today)
        )
      )
      .limit(1);

    if (!row) {
      await tx.insert(smsusage).values({
        gatewayId,
        channel,
        usageDate: today,
        count: 1,
      });
      return;
    }

    if (row.count >= limit) {
      throw httpError(429, 'SmsQuotaExceeded', 'Daily SMS quota reached.');
    }

    await tx
      .update(smsusage)
      .set({ count: row.count + 1, updatedAt: new Date() })
      .where(eq(smsusage.id, row.id));
  });
}
