import { OAuth2Client } from 'google-auth-library';
import { env } from '../../../config/env.js';
import type { OAuthExchangeResult, OAuthVerifyResult, VerifiedGoogleIdentity } from './types.js';

export async function exchangeCodeForIdToken(
  code: string,
  redirectUri: string
): Promise<OAuthExchangeResult> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) return { ok: false, message: 'Token exchange failed' };

  const tok = (await tokenRes.json()) as { id_token?: string };
  if (!tok.id_token) return { ok: false, message: 'No id_token' };
  return { ok: true, idToken: tok.id_token };
}

export async function verifyGoogleIdentity(
  oauthClient: OAuth2Client,
  idToken: string,
  expectedNonce: string
): Promise<OAuthVerifyResult> {
  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const info = ticket.getPayload();
  if (!info || !info.sub) return { ok: false, message: 'Invalid id_token payload' };
  if (!info.nonce || info.nonce !== expectedNonce) return { ok: false, message: 'Nonce mismatch' };
  if (info.email_verified !== true) return { ok: false, message: 'Email not verified' };

  const emailRaw = info.email ?? '';
  if (!emailRaw) return { ok: false, message: 'Google account missing email' };

  const email = emailRaw.toLowerCase();
  const verifiedAt = info.email_verified ? new Date() : null;
  const name =
    info.name?.trim() ||
    `${info.given_name ?? ''} ${info.family_name ?? ''}`.trim() ||
    email.split('@')[0] ||
    email;

  const identity: VerifiedGoogleIdentity = {
    gsub: info.sub,
    email,
    name,
    verifiedAt,
  };

  return { ok: true, identity };
}
