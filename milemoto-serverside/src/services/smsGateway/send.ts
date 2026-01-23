import { eq } from 'drizzle-orm';
import { smsgateways } from '@milemoto/types';
import type { SendTestSmsDto, SendTestWhatsappDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { randToken } from '../../utils/crypto.js';
import { sendInfobipSms } from '../sms/providers/infobip.js';
import { sendInfobipWhatsapp } from '../sms/providers/infobipWhatsapp.js';
import { isInfobipTemplateApproved } from '../sms/providers/infobipTemplates.js';
import { parseConfig } from './config.js';
import { decodeSecrets } from './secrets.js';
import { assertPhoneNotBlocked } from './guards.js';
import { enforceDailyQuota } from './quota.js';
import { recordDeliveryReport } from './deliveryReports.js';

async function getActiveGateway() {
  const [row] = await db
    .select()
    .from(smsgateways)
    .where(eq(smsgateways.status, 'active'))
    .limit(1);
  return row ?? null;
}

export async function sendSmsMessage(input: { toNumber: string; message: string }) {
  await assertPhoneNotBlocked(input.toNumber);
  const row = await getActiveGateway();
  if (!row) {
    throw httpError(400, 'SmsGatewayNotConfigured', 'No active SMS gateway configured.');
  }

  const config = parseConfig(row.configJson);
  const secrets = decodeSecrets(row.secretEnc ?? null);

  if (!config.baseUrl || !config.senderId || !secrets.apiKey) {
    throw httpError(
      400,
      'SmsGatewayNotConfigured',
      'Active SMS gateway is missing Base URL, Sender ID, or API key. Save settings first.'
    );
  }
  if (!config.smsSenderVerified) {
    throw httpError(
      400,
      'SmsSenderNotVerified',
      'SMS sender is not verified. Verify the sender before sending messages.'
    );
  }

  if (row.provider === 'infobip') {
    try {
      await enforceDailyQuota(Number(row.id), 'sms');
      const result = await sendInfobipSms({
        baseUrl: config.baseUrl,
        apiKey: secrets.apiKey,
        senderId: config.senderId,
        toNumber: input.toNumber,
        message: input.message,
      });
      await recordDeliveryReport({
        provider: 'infobip',
        channel: 'sms',
        gatewayId: Number(row.id),
        messageId: result.messageId ?? randToken(8),
        toNumber: input.toNumber,
        statusName: 'SENT',
        statusDescription: 'Message accepted by provider.',
        sentAt: new Date(),
        rawPayload: result.raw ? JSON.stringify(result.raw) : null,
      });
      return { ok: true };
    } catch (e: unknown) {
      const err = e as { message?: string };
      throw httpError(
        400,
        'SmsSendFailed',
        `Failed to send SMS. ${err?.message ?? 'Please verify your provider settings.'}`
      );
    }
  }

  throw httpError(400, 'SmsProviderUnsupported', 'This SMS provider is not supported.');
}

export async function sendTestSms(data: SendTestSmsDto): Promise<{ ok: true }> {
  await assertPhoneNotBlocked(data.toNumber);
  const row = await getActiveGateway();
  if (!row) {
    throw httpError(400, 'SmsGatewayNotConfigured', 'No active SMS gateway configured.');
  }

  const config = parseConfig(row.configJson);
  const secrets = decodeSecrets(row.secretEnc ?? null);

  if (!config.baseUrl || !config.senderId || !secrets.apiKey) {
    throw httpError(
      400,
      'SmsGatewayNotConfigured',
      'Active SMS gateway is missing Base URL, Sender ID, or API key. Save settings first.'
    );
  }
  if (!config.smsSenderVerified) {
    throw httpError(
      400,
      'SmsSenderNotVerified',
      'SMS sender is not verified. Verify the sender before sending messages.'
    );
  }

  const message =
    data.message ?? 'Test SMS from MileMoto. Your SMS gateway is configured correctly.';

  if (row.provider === 'infobip') {
    try {
      await enforceDailyQuota(Number(row.id), 'sms');
      const result = await sendInfobipSms({
        baseUrl: config.baseUrl,
        apiKey: secrets.apiKey,
        senderId: config.senderId,
        toNumber: data.toNumber,
        message,
      });
      await recordDeliveryReport({
        provider: 'infobip',
        channel: 'sms',
        gatewayId: Number(row.id),
        messageId: result.messageId ?? randToken(8),
        toNumber: data.toNumber,
        statusName: 'SENT',
        statusDescription: 'Test message accepted by provider.',
        sentAt: new Date(),
        rawPayload: result.raw ? JSON.stringify(result.raw) : null,
      });
      return { ok: true };
    } catch (e: unknown) {
      const err = e as { message?: string };
      throw httpError(
        400,
        'SmsSendFailed',
        `Failed to send test SMS. ${err?.message ?? 'Please verify your provider settings.'}`
      );
    }
  }

  throw httpError(400, 'SmsProviderUnsupported', 'This SMS provider is not supported.');
}

export async function sendTestWhatsapp(data: SendTestWhatsappDto): Promise<{ ok: true }> {
  await assertPhoneNotBlocked(data.toNumber);
  const row = await getActiveGateway();
  if (!row) {
    throw httpError(400, 'SmsGatewayNotConfigured', 'No active SMS gateway configured.');
  }

  const config = parseConfig(row.configJson);
  const secrets = decodeSecrets(row.secretEnc ?? null);

  if (
    !config.baseUrl ||
    !config.whatsappSenderId ||
    !config.whatsappTemplateName ||
    !secrets.apiKey
  ) {
    throw httpError(
      400,
      'SmsGatewayNotConfigured',
      'Active SMS gateway is missing WhatsApp sender, template, or API key. Save settings first.'
    );
  }
  if (!config.whatsappSenderVerified) {
    throw httpError(
      400,
      'WhatsappSenderNotVerified',
      'WhatsApp sender is not verified. Verify the sender before sending messages.'
    );
  }

  const messagePlaceholder = data.placeholder ?? 'Test';
  const language = config.whatsappLanguage ?? 'en';

  if (row.provider === 'infobip') {
    try {
      const approved = await isInfobipTemplateApproved({
        baseUrl: config.baseUrl,
        apiKey: secrets.apiKey,
        senderId: config.whatsappSenderId,
        templateName: config.whatsappTemplateName,
      });
      if (!approved) {
        throw httpError(
          400,
          'WhatsappTemplateNotApproved',
          'WhatsApp template is not approved. Update the template or choose an approved one.'
        );
      }
      await enforceDailyQuota(Number(row.id), 'whatsapp');
      const result = await sendInfobipWhatsapp({
        baseUrl: config.baseUrl,
        apiKey: secrets.apiKey,
        senderId: config.whatsappSenderId,
        toNumber: data.toNumber,
        templateName: config.whatsappTemplateName,
        language,
        placeholders: [messagePlaceholder],
      });
      await recordDeliveryReport({
        provider: 'infobip',
        channel: 'whatsapp',
        gatewayId: Number(row.id),
        messageId: result.messageId ?? randToken(8),
        toNumber: data.toNumber,
        statusName: 'SENT',
        statusDescription: 'WhatsApp message accepted by provider.',
        sentAt: new Date(),
        rawPayload: result.raw ? JSON.stringify(result.raw) : null,
      });
      return { ok: true };
    } catch (e: unknown) {
      const err = e as { message?: string };
      throw httpError(
        400,
        'WhatsappSendFailed',
        `Failed to send test WhatsApp message. ${err?.message ?? 'Please verify your provider settings.'}`
      );
    }
  }

  throw httpError(400, 'SmsProviderUnsupported', 'This SMS provider is not supported.');
}
