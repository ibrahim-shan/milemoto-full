import type { SmsGatewayResponseDto } from '@milemoto/types';
import { smsgateways } from '@milemoto/types';
import { parseConfig } from './config.js';
import { toIso } from './utils.js';

export function mapGateway(row: typeof smsgateways.$inferSelect): SmsGatewayResponseDto {
  const config = parseConfig(row.configJson);
  return {
    id: Number(row.id),
    provider: row.provider as SmsGatewayResponseDto['provider'],
    name: String(row.name),
    status: row.status as SmsGatewayResponseDto['status'],
    baseUrl: config.baseUrl ?? null,
    senderId: config.senderId ?? null,
    smsSenderVerified: config.smsSenderVerified ?? false,
    whatsappSenderId: config.whatsappSenderId ?? null,
    whatsappSenderVerified: config.whatsappSenderVerified ?? false,
    whatsappTemplateName: config.whatsappTemplateName ?? null,
    whatsappLanguage: config.whatsappLanguage ?? null,
    hasApiKey: Boolean(row.secretEnc),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}
