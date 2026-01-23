import { randomBytes, createHash, timingSafeEqual, createCipheriv, createDecipheriv } from 'crypto';
import { env } from '../config/env.js';

/** SHA-256 hex */
export function sha256(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

/** URL-safe random token (base64url, no padding) */
export function randToken(bytes = 32): string {
  return randomBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/** Decode base64 key from env; must be 32 bytes for AES-256-GCM */
function getMfaKey(): Buffer {
  const raw = String(env.MFA_SECRET_KEY);
  const encoding = raw.includes('-') || raw.includes('_') ? 'base64url' : 'base64';
  const key = Buffer.from(raw, encoding);
  if (key.length !== 32) throw new Error('MFA key must be 32 bytes');
  return key;
}

function getMailKey(): Buffer {
  const raw = env.MAIL_SECRET_KEY ? String(env.MAIL_SECRET_KEY) : '';
  if (!raw) return getMfaKey();
  const encoding = raw.includes('-') || raw.includes('_') ? 'base64url' : 'base64';
  const key = Buffer.from(raw, encoding);
  if (key.length !== 32) throw new Error('MAIL key must be 32 bytes');
  return key;
}

function getSmsKey(): Buffer {
  const raw = env.SMS_SECRET_KEY ? String(env.SMS_SECRET_KEY) : '';
  if (!raw) return getMailKey();
  const encoding = raw.includes('-') || raw.includes('_') ? 'base64url' : 'base64';
  const key = Buffer.from(raw, encoding);
  if (key.length !== 32) throw new Error('SMS key must be 32 bytes');
  return key;
}

function encryptWithKey(key: Buffer, plain: Buffer | Uint8Array): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]);
}

function normalizeBlob(blob: unknown): Buffer {
  if (Buffer.isBuffer(blob)) return blob;
  if (blob instanceof Uint8Array) return Buffer.from(blob);
  if (Array.isArray(blob)) return Buffer.from(blob);
  if (blob && typeof blob === 'object' && 'data' in blob) {
    const data = (blob as { data?: unknown }).data;
    if (Array.isArray(data)) return Buffer.from(data);
  }
  if (
    blob &&
    typeof blob === 'object' &&
    'type' in blob &&
    (blob as { type?: string }).type === 'Buffer'
  ) {
    const data = (blob as { data?: unknown }).data;
    if (Array.isArray(data)) return Buffer.from(data);
  }
  if (typeof blob === 'string') {
    let trimmed = blob.trim();
    if (trimmed.startsWith('0x')) trimmed = trimmed.slice(2);
    const isHex = /^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0;
    return Buffer.from(trimmed, isHex ? 'hex' : 'base64');
  }
  return Buffer.from(String(blob));
}

function decryptWithKey(key: Buffer, blob: unknown): Buffer {
  const buffer = normalizeBlob(blob);
  if (buffer.length < 12 + 16) throw new Error('Blob too small');
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(buffer.length - 16);
  const ct = buffer.subarray(12, buffer.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

/**
 * AES-256-GCM encrypt → single blob: [12-byte IV | ciphertext | 16-byte tag]
 * Store as VARBINARY in DB.
 */
export function encryptToBlob(plain: Buffer | Uint8Array): Buffer {
  return encryptWithKey(getMfaKey(), plain);
}

/** AES-256-GCM decrypt from single blob format above */
export function decryptFromBlob(blob: unknown): Buffer {
  return decryptWithKey(getMfaKey(), blob);
}

export function encryptMailToBlob(plain: Buffer | Uint8Array): Buffer {
  return encryptWithKey(getMailKey(), plain);
}

export function decryptMailFromBlob(blob: unknown): Buffer {
  try {
    return decryptWithKey(getMailKey(), blob);
  } catch {
    return decryptWithKey(getMfaKey(), blob);
  }
}

export function encryptSmsToBlob(plain: Buffer | Uint8Array): Buffer {
  return encryptWithKey(getSmsKey(), plain);
}

export function decryptSmsFromBlob(blob: unknown): Buffer {
  try {
    return decryptWithKey(getSmsKey(), blob);
  } catch {
    return decryptWithKey(getMailKey(), blob);
  }
}

/** Constant-time compare for buffers/strings */
export function safeEquals(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
