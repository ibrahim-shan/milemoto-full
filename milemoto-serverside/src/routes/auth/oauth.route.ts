// src/routes/auth/oauth.route.ts
import { Router } from 'express';
import crypto from 'crypto';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';
import {
  safeNext,
  verifyState,
  signState,
  validateTrustedCookie,
} from '../helpers/auth.helpers.js';
import { OAuth2Client } from 'google-auth-library';
import {
  exchangeCodeForIdToken,
  verifyGoogleIdentity,
  resolveOrCreateUserFromGoogle,
  createSessionAndRedirect,
  createMfaChallengeAndRedirect,
} from '../helpers/oauth.helpers.js';

export const oauthAuth = Router();
const oauthClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

function buildSigninErrorUrl(error: string, nextPath?: string) {
  const url = new URL(joinUrl(env.FRONTEND_BASE_URL, '/signin'));
  url.searchParams.set('error', error);
  if (nextPath) url.searchParams.set('next', safeNext(nextPath));
  return url.toString();
}

function joinUrl(base: string, path: string) {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function getGoogleRedirectUri() {
  return joinUrl(env.PUBLIC_API_BASE_URL, '/api/v1/auth/google/callback');
}

oauthAuth.get('/google/start', (req, res) => {
  const next = safeNext(req.query.next);
  const remember = String(req.query.remember) === '1' || String(req.query.remember) === 'true';
  const nonce = crypto.randomBytes(16).toString('base64url');
  const state = signState({ next, remember, nonce });

  const redirectUri = getGoogleRedirectUri();

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('nonce', nonce);

  return res.redirect(url.toString());
});

oauthAuth.get('/google/callback', async (req, res) => {
  let nextPath: string | undefined;
  try {
    const code = String(req.query.code || '');
    const stateStr = String(req.query.state || '');
    const state = verifyState(stateStr);
    if (!code || !state) return res.redirect(buildSigninErrorUrl('InvalidOAuthState'));
    nextPath = state.next || '/account';

    const redirectUri = getGoogleRedirectUri();

    const exchanged = await exchangeCodeForIdToken(code, redirectUri);
    if (!exchanged.ok) return res.redirect(buildSigninErrorUrl('OAuthExchangeFailed', nextPath));

    const verified = await verifyGoogleIdentity(oauthClient, exchanged.idToken, state.nonce);
    if (!verified.ok) return res.redirect(buildSigninErrorUrl('OAuthVerifyFailed', nextPath));

    const u = await resolveOrCreateUserFromGoogle(verified.identity);
    if (!u) return res.redirect(buildSigninErrorUrl('OAuthUserResolutionFailed', nextPath));

    if (u.status !== 'active') {
      return res.redirect(`${env.FRONTEND_BASE_URL}/signin?error=AccountDisabled`);
    }

    if (!u.emailVerifiedAt) {
      return res.redirect(`${env.FRONTEND_BASE_URL}/signin?error=EmailNotVerified`);
    }

    if (u.mfaEnabled) {
      // MFA logic
      try {
        const isTrusted = await validateTrustedCookie(
          req,
          String(u.id),
          u.role as 'user' | 'admin'
        );
        if (isTrusted) {
          const url = await createSessionAndRedirect({
            userId: u.id,
            role: u.role as 'user' | 'admin',
            remember: Boolean(state.remember),
            req,
            res,
            nextPath,
          });
          return res.redirect(url);
        }
      } catch (e) {
        logger.warn({ e, userId: String(u.id) }, 'Google trusted-device bypass failed');
      }

      // MFA challenge
      const url = await createMfaChallengeAndRedirect({
        userId: u.id,
        remember: Boolean(state.remember),
        req,
        nextPath,
      });
      return res.redirect(url);
    }

    // No MFA: Create session
    const url = await createSessionAndRedirect({
      userId: u.id,
      role: u.role as 'user' | 'admin',
      remember: Boolean(state.remember),
      req,
      res,
      nextPath,
    });
    return res.redirect(url);
  } catch (e) {
    logger.error(
      {
        err: e,
        path: req.originalUrl,
        method: req.method,
        requestId: (req as { id?: unknown }).id,
      },
      'OAuth callback failed'
    );
    return res.redirect(buildSigninErrorUrl('OAuthFailed', nextPath));
  }
});
