import crypto from 'crypto';
import { env } from '../../../config/env.js';

// --- Helper Functions ---

export function backupHash(code: string) {
  return crypto.createHmac('sha256', env.BACKUP_CODE_HMAC_SECRET).update(code).digest('hex');
}

// (HMAC-based legacy cookie helpers)
export function signTrustedDevice(payload: { sub: string; exp: number }) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', env.OAUTH_STATE_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyTrustedDevice(token: string): { sub: string; exp: number } | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expSig = crypto
    .createHmac('sha256', env.OAUTH_STATE_SECRET)
    .update(body)
    .digest('base64url');
  const ok =
    expSig.length === sig.length && crypto.timingSafeEqual(Buffer.from(expSig), Buffer.from(sig));
  if (!ok) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      sub: string;
      exp: number;
    };
    if (typeof p.sub !== 'string' || typeof p.exp !== 'number') return null;
    return p;
  } catch {
    return null;
  }
}
