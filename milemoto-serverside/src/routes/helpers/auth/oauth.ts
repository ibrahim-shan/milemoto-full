import crypto from 'crypto';
import { env } from '../../../config/env.js';

// (OAuth helpers)
export type OAuthStatePayload = { next: string; remember: boolean; nonce: string };

export function signState(payload: OAuthStatePayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', env.OAUTH_STATE_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyState(state: string): OAuthStatePayload | null {
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;
  const exp = crypto.createHmac('sha256', env.OAUTH_STATE_SECRET).update(body).digest('base64url');
  const ok =
    exp.length === sig.length && crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(sig));
  if (!ok) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8')
    ) as Partial<OAuthStatePayload>;
    if (
      !parsed ||
      typeof parsed.next !== 'string' ||
      typeof parsed.remember !== 'boolean' ||
      typeof parsed.nonce !== 'string'
    ) {
      return null;
    }
    return parsed as OAuthStatePayload;
  } catch {
    return null;
  }
}

export function safeNext(n: unknown): string {
  let s: string | undefined = undefined;

  if (typeof n === 'string') {
    s = n;
  } else if (Array.isArray(n) && n.length > 0 && typeof n[0] === 'string') {
    s = n[0];
  }
  if (s && s.startsWith('/') && !s.startsWith('//')) {
    return s;
  }
  return '/account';
}
