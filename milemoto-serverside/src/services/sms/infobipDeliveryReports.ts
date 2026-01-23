import { eq } from 'drizzle-orm';
import { smsdeliveryreports, smsgateways } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';

type InfobipDeliveryStatus = {
  groupId?: number;
  groupName?: string;
  id?: number;
  name?: string;
  description?: string;
};

type InfobipDeliveryError = {
  id?: number;
  name?: string;
  description?: string;
};

type InfobipDeliveryResult = {
  messageId?: string;
  to?: string;
  status?: InfobipDeliveryStatus;
  error?: InfobipDeliveryError;
  bulkId?: string;
  sentAt?: string;
  doneAt?: string;
};

type InfobipDeliveryPayload = {
  results?: InfobipDeliveryResult[];
  bulkId?: string;
};

function toDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeResults(payload: InfobipDeliveryPayload) {
  if (!Array.isArray(payload.results)) {
    return [];
  }
  return payload.results.filter((result) => result?.messageId && result?.to);
}

async function findActiveGatewayId(provider: string): Promise<number | null> {
  const [row] = await db
    .select({ id: smsgateways.id })
    .from(smsgateways)
    .where(eq(smsgateways.status, 'active'))
    .limit(1);
  if (!row || provider !== 'infobip') return null;
  return Number(row.id);
}

export async function storeInfobipDeliveryReport(
  payload: unknown
): Promise<{ ok: true; count: number }> {
  if (!payload || typeof payload !== 'object') {
    throw httpError(400, 'InvalidPayload', 'Invalid delivery report payload.');
  }

  const castPayload = payload as InfobipDeliveryPayload;
  const results = normalizeResults(castPayload);

  if (results.length === 0) {
    throw httpError(400, 'InvalidPayload', 'Delivery report payload is empty.');
  }

  const gatewayId = await findActiveGatewayId('infobip');

  const rows: Array<typeof smsdeliveryreports.$inferInsert> = results.map((result) => ({
    provider: 'infobip',
    channel: 'sms',
    gatewayId: gatewayId ?? null,
    messageId: String(result.messageId),
    toNumber: String(result.to),
    statusGroup: result.status?.groupName ?? null,
    statusGroupId: result.status?.groupId ?? null,
    statusName: result.status?.name ?? null,
    statusId: result.status?.id ?? null,
    statusDescription: result.status?.description ?? null,
    errorName: result.error?.name ?? null,
    errorDescription: result.error?.description ?? null,
    bulkId: result.bulkId ?? castPayload.bulkId ?? null,
    sentAt: toDate(result.sentAt),
    doneAt: toDate(result.doneAt),
    rawPayload: JSON.stringify(result),
  }));

  for (const row of rows) {
    await db
      .insert(smsdeliveryreports)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          statusGroup: row.statusGroup ?? null,
          statusGroupId: row.statusGroupId ?? null,
          statusName: row.statusName ?? null,
          statusId: row.statusId ?? null,
          statusDescription: row.statusDescription ?? null,
          errorName: row.errorName ?? null,
          errorDescription: row.errorDescription ?? null,
          bulkId: row.bulkId ?? null,
          sentAt: row.sentAt ?? null,
          doneAt: row.doneAt ?? null,
          rawPayload: row.rawPayload ?? null,
          receivedAt: new Date(),
        },
      });
  }

  return { ok: true, count: rows.length };
}
