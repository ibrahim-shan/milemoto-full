import { httpError } from '../../utils/error.js';

export type SmsGatewayConfig = {
  baseUrl: string | null;
  senderId: string | null;
  smsSenderVerified: boolean;
  whatsappSenderId: string | null;
  whatsappSenderVerified: boolean;
  whatsappTemplateName: string | null;
  whatsappLanguage: string | null;
};

export function parseConfig(configJson: string | null): SmsGatewayConfig {
  if (!configJson) {
    return {
      baseUrl: null,
      senderId: null,
      smsSenderVerified: false,
      whatsappSenderId: null,
      whatsappSenderVerified: false,
      whatsappTemplateName: null,
      whatsappLanguage: null,
    };
  }
  try {
    const parsed = JSON.parse(configJson) as Partial<SmsGatewayConfig>;
    return {
      baseUrl: parsed.baseUrl ?? null,
      senderId: parsed.senderId ?? null,
      smsSenderVerified: parsed.smsSenderVerified ?? false,
      whatsappSenderId: parsed.whatsappSenderId ?? null,
      whatsappSenderVerified: parsed.whatsappSenderVerified ?? false,
      whatsappTemplateName: parsed.whatsappTemplateName ?? null,
      whatsappLanguage: parsed.whatsappLanguage ?? null,
    };
  } catch {
    return {
      baseUrl: null,
      senderId: null,
      smsSenderVerified: false,
      whatsappSenderId: null,
      whatsappSenderVerified: false,
      whatsappTemplateName: null,
      whatsappLanguage: null,
    };
  }
}

export function encodeConfig(config: SmsGatewayConfig): string {
  return JSON.stringify({
    baseUrl: config.baseUrl ?? null,
    senderId: config.senderId ?? null,
    smsSenderVerified: config.smsSenderVerified ?? false,
    whatsappSenderId: config.whatsappSenderId ?? null,
    whatsappSenderVerified: config.whatsappSenderVerified ?? false,
    whatsappTemplateName: config.whatsappTemplateName ?? null,
    whatsappLanguage: config.whatsappLanguage ?? null,
  });
}

export function normalizeBaseUrl(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.origin;
  } catch {
    throw httpError(400, 'SmsGatewayInvalidUrl', 'Base URL must be a valid http(s) URL.');
  }
}
