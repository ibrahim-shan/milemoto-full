import { decryptSmsFromBlob, encryptSmsToBlob } from '../../utils/crypto.js';

export type SmsGatewaySecrets = {
  apiKey: string | null;
};

export function encodeSecrets(secrets: SmsGatewaySecrets): Buffer {
  return encryptSmsToBlob(Buffer.from(JSON.stringify(secrets), 'utf8'));
}

export function decodeSecrets(secretEnc: Buffer | null): SmsGatewaySecrets {
  if (!secretEnc) return { apiKey: null };
  const raw = decryptSmsFromBlob(secretEnc).toString('utf8');
  const parsed = JSON.parse(raw) as Partial<SmsGatewaySecrets>;
  return { apiKey: parsed.apiKey ?? null };
}
