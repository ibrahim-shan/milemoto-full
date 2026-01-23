import type { SmsDeliveryReportResponseDto } from '@milemoto/types';
import { smsdeliveryreports } from '@milemoto/types';
import { desc } from 'drizzle-orm';
import { db } from '../../db/drizzle.js';
import { toIso } from './utils.js';

export async function listSmsDeliveryReports(limit = 20): Promise<SmsDeliveryReportResponseDto[]> {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const rows = await db
    .select({
      id: smsdeliveryreports.id,
      provider: smsdeliveryreports.provider,
      channel: smsdeliveryreports.channel,
      messageId: smsdeliveryreports.messageId,
      toNumber: smsdeliveryreports.toNumber,
      statusGroup: smsdeliveryreports.statusGroup,
      statusName: smsdeliveryreports.statusName,
      statusDescription: smsdeliveryreports.statusDescription,
      errorName: smsdeliveryreports.errorName,
      errorDescription: smsdeliveryreports.errorDescription,
      sentAt: smsdeliveryreports.sentAt,
      doneAt: smsdeliveryreports.doneAt,
      receivedAt: smsdeliveryreports.receivedAt,
    })
    .from(smsdeliveryreports)
    .orderBy(desc(smsdeliveryreports.receivedAt))
    .limit(safeLimit);

  return rows.map((row) => ({
    id: Number(row.id),
    provider: row.provider as SmsDeliveryReportResponseDto['provider'],
    channel: row.channel as SmsDeliveryReportResponseDto['channel'],
    messageId: String(row.messageId),
    toNumber: String(row.toNumber),
    statusGroup: row.statusGroup ?? null,
    statusName: row.statusName ?? null,
    statusDescription: row.statusDescription ?? null,
    errorName: row.errorName ?? null,
    errorDescription: row.errorDescription ?? null,
    sentAt: row.sentAt ? toIso(row.sentAt) : null,
    doneAt: row.doneAt ? toIso(row.doneAt) : null,
    receivedAt: toIso(row.receivedAt),
  }));
}

export async function recordDeliveryReport(input: {
  provider: 'infobip';
  channel: 'sms' | 'whatsapp';
  gatewayId: number;
  messageId: string;
  toNumber: string;
  statusName: string;
  statusDescription: string;
  sentAt: Date;
  rawPayload?: string | null;
}) {
  await db.insert(smsdeliveryreports).values({
    provider: input.provider,
    channel: input.channel,
    gatewayId: input.gatewayId,
    messageId: input.messageId,
    toNumber: input.toNumber,
    statusName: input.statusName,
    statusDescription: input.statusDescription,
    sentAt: input.sentAt,
    rawPayload: input.rawPayload ?? null,
  });
}
