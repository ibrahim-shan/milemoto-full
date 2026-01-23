import { and, eq } from 'drizzle-orm';
import { smsgateways } from '@milemoto/types';
import type {
  CreateSmsGatewayDto,
  SmsGatewayResponseDto,
  UpdateSmsGatewayDto,
} from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import type { SmsGatewayConfig } from './config.js';
import { parseConfig, encodeConfig, normalizeBaseUrl } from './config.js';
import { encodeSecrets, decodeSecrets } from './secrets.js';
import { mapGateway } from './mapper.js';

export async function createSmsGateway(data: CreateSmsGatewayDto): Promise<SmsGatewayResponseDto> {
  const config: SmsGatewayConfig = {
    baseUrl: normalizeBaseUrl(data.baseUrl ?? null),
    senderId: data.senderId ?? null,
    smsSenderVerified: data.smsSenderVerified ?? false,
    whatsappSenderId: data.whatsappSenderId ?? null,
    whatsappSenderVerified: data.whatsappSenderVerified ?? false,
    whatsappTemplateName: data.whatsappTemplateName ?? null,
    whatsappLanguage: data.whatsappLanguage ?? null,
  };

  const insert: typeof smsgateways.$inferInsert = {
    provider: data.provider,
    name: data.name,
    status: 'inactive',
    configJson: encodeConfig(config),
  };

  if (data.apiKey !== undefined) {
    if (data.apiKey === null) {
      insert.secretEnc = null;
    } else {
      insert.secretEnc = encodeSecrets({ apiKey: data.apiKey });
    }
  }

  await db.insert(smsgateways).values(insert);

  const [created] = await db
    .select()
    .from(smsgateways)
    .where(and(eq(smsgateways.provider, data.provider), eq(smsgateways.name, data.name)))
    .limit(1);

  if (!created) throw httpError(500, 'InsertFailed', 'Failed to create SMS gateway');
  return mapGateway(created);
}

export async function updateSmsGateway(
  id: number,
  data: UpdateSmsGatewayDto
): Promise<SmsGatewayResponseDto> {
  const [row] = await db.select().from(smsgateways).where(eq(smsgateways.id, id)).limit(1);
  if (!row) throw httpError(404, 'NotFound', 'SMS gateway not found');

  const config = parseConfig(row.configJson);
  const updates: Partial<typeof smsgateways.$inferInsert> = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.baseUrl !== undefined) config.baseUrl = normalizeBaseUrl(data.baseUrl ?? null);
  if (data.senderId !== undefined) config.senderId = data.senderId ?? null;
  if (data.smsSenderVerified !== undefined) {
    config.smsSenderVerified = data.smsSenderVerified;
  }
  if (data.whatsappSenderId !== undefined) {
    config.whatsappSenderId = data.whatsappSenderId ?? null;
  }
  if (data.whatsappSenderVerified !== undefined) {
    config.whatsappSenderVerified = data.whatsappSenderVerified;
  }
  if (data.whatsappTemplateName !== undefined) {
    config.whatsappTemplateName = data.whatsappTemplateName ?? null;
  }
  if (data.whatsappLanguage !== undefined) {
    config.whatsappLanguage = data.whatsappLanguage ?? null;
  }
  updates.configJson = encodeConfig(config);

  if (data.apiKey !== undefined) {
    if (data.apiKey === null) {
      updates.secretEnc = null;
    } else {
      updates.secretEnc = encodeSecrets({ apiKey: data.apiKey });
    }
  }

  await db.update(smsgateways).set(updates).where(eq(smsgateways.id, id));

  const [updated] = await db.select().from(smsgateways).where(eq(smsgateways.id, id)).limit(1);
  if (!updated) throw httpError(500, 'UpdateFailed', 'Failed to update SMS gateway');
  return mapGateway(updated);
}

export async function activateSmsGateway(id: number): Promise<SmsGatewayResponseDto> {
  const [row] = await db.select().from(smsgateways).where(eq(smsgateways.id, id)).limit(1);
  if (!row) throw httpError(404, 'NotFound', 'SMS gateway not found');

  const config = parseConfig(row.configJson);
  const secrets = decodeSecrets(row.secretEnc ?? null);

  if (!config.baseUrl || !config.senderId || !secrets.apiKey) {
    throw httpError(
      400,
      'SmsGatewayNotConfigured',
      'Save Base URL, Sender ID, and API key before activating this gateway.'
    );
  }
  if (!config.smsSenderVerified) {
    throw httpError(
      400,
      'SmsSenderNotVerified',
      'Verify the SMS sender before activating this gateway.'
    );
  }

  await db.transaction(async (tx) => {
    await tx.update(smsgateways).set({ status: 'inactive' });
    await tx.update(smsgateways).set({ status: 'active' }).where(eq(smsgateways.id, id));
  });

  const [updated] = await db.select().from(smsgateways).where(eq(smsgateways.id, id)).limit(1);
  if (!updated) throw httpError(500, 'UpdateFailed', 'Failed to activate SMS gateway');
  return mapGateway(updated);
}
