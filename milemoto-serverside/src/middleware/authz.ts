import type { Request, Response, NextFunction } from 'express';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { verifyAccess, verifyRefresh } from '../utils/jwt.js';
import { env } from '../config/env.js';
import { sessions, users } from '@milemoto/types';
import { db } from '../db/drizzle.js';
import { sha256 } from '../utils/crypto.js';
import { httpError } from '../utils/error.js';
import * as rbacService from '../services/rbac.service.js';

const RANK = { user: 1, admin: 2 } as const;

type PermissionCacheEntry = { expiresAtMs: number; perms: string[] };
const permissionCache = new Map<number, PermissionCacheEntry>();
let permissionCacheOps = 0;

async function getCachedUserPermissions(userId: number): Promise<string[]> {
  const now = Date.now();
  const cached = permissionCache.get(userId);
  if (cached && cached.expiresAtMs > now) return cached.perms;

  const perms = await rbacService.getUserPermissions(userId);
  permissionCache.set(userId, { perms, expiresAtMs: now + env.RBAC_PERMISSIONS_CACHE_TTL_MS });

  permissionCacheOps++;
  if (permissionCacheOps % 200 === 0) {
    for (const [id, entry] of permissionCache) {
      if (entry.expiresAtMs <= now) permissionCache.delete(id);
    }
  }

  return perms;
}

export function requireAtLeast(min: keyof typeof RANK) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const u = req.user;
    if (!u) return next(httpError(401, 'Unauthorized', 'Authentication required'));
    if ((RANK[u.role as keyof typeof RANK] ?? 0) < RANK[min]) {
      return next(httpError(403, 'Forbidden', 'Forbidden'));
    }
    next();
  };
}

async function authenticateViaRefreshCookie(req: Request) {
  const token = req.cookies?.[env.REFRESH_COOKIE_NAME];
  if (!token) return null;
  const { sid, sub } = verifyRefresh(token);
  const userIdNum = Number(sub);
  if (!Number.isFinite(userIdNum)) return null;

  const [session] = await db
    .select({
      refreshHash: sessions.refreshHash,
      revokedAt: sessions.revokedAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(and(eq(sessions.id, sid), eq(sessions.userId, userIdNum)))
    .limit(1);

  const expiresAt =
    session?.expiresAt instanceof Date
      ? session.expiresAt
      : session
        ? new Date(session.expiresAt)
        : null;
  if (
    !session ||
    session.revokedAt ||
    (expiresAt ? expiresAt < new Date() : true) ||
    sha256(token) !== session.refreshHash
  ) {
    if (session && sha256(token) !== session.refreshHash) {
      await db
        .update(sessions)
        .set({ revokedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(sessions.id, sid), isNull(sessions.revokedAt)));
    }
    return null;
  }

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userIdNum))
    .limit(1);
  if (!user) return null;
  return { id: String(userIdNum), role: user.role as 'user' | 'admin' };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authz = req.get('authorization') || '';
  if (authz.startsWith('Bearer ')) {
    try {
      const payload = verifyAccess(authz.slice(7));
      req.user = { id: payload.sub, role: payload.role };
      return next();
    } catch {
      return next(httpError(401, 'Unauthorized', 'Invalid token'));
    }
  }

  try {
    const fallbackUser = await authenticateViaRefreshCookie(req);
    if (!fallbackUser) {
      return next(httpError(401, 'Unauthorized', 'Authentication required'));
    }
    req.user = fallbackUser;
    return next();
  } catch (err) {
    return next(err);
  }
}

export function requireRole(role: 'admin' | 'user') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const u = req.user;
    if (!u) return next(httpError(401, 'Unauthorized', 'Authentication required'));
    if (u.role !== role) return next(httpError(403, 'Forbidden', 'Forbidden'));
    next();
  };
}

export function requirePermission(permissionSlug: string | string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(httpError(401, 'Unauthorized', 'Authentication required'));

      // Fetch permissions for the user (role-based)
      const userId = Number(req.user.id);
      const perms = await getCachedUserPermissions(userId);
      const required = Array.isArray(permissionSlug) ? permissionSlug : [permissionSlug];

      const hasAccess = required.some((p) => perms.includes(p));

      if (!hasAccess) {
        return next(
          httpError(403, 'Forbidden', `Missing permission. Required one of: ${required.join(', ')}`)
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
