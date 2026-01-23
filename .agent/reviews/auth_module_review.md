# Auth Module Review and Recommended Refactors

## Overview
This document provides a detailed review of the authentication module you provided, highlighting areas of strength and suggesting specific improvements to increase maintainability, security, and readability.

---

## 1. Architecture & Organization
**Strengths:**
- Clear separation into `core`, `password`, `mfa`, `user`, and `oauth` routes.
- Use of sub-routers for modularity.
- CSRF defense via origin/referer checks.
- Rate limiting per IP, user, email, and MFA challenge.

**Recommendations:**
- [DONE] Added a helper middleware to check `req.user` and avoid repeating `if (!req.user)` in almost every route (`milemoto-serverside/src/routes/auth/auth.middleware.ts`) and refactored auth routes to use it.
- [DONE] Split Google OAuth callback logic into smaller helper functions inside `milemoto-serverside/src/routes/auth/oauth.route.ts` (user resolution, session creation, MFA flow).

---

## 2. Security
**Strengths:**
- Access and refresh token separation is implemented correctly.
- Refresh token validation includes session hash verification, expiration, and revocation.
- MFA (TOTP and backup codes) is integrated.
- Role-based and permission-based access checks are present.
- Google OAuth nonce verification is implemented.
- Rate limiting is scoped properly.

**Recommendations:**
- [DONE] Keep cookies at `SameSite=Lax` (OAuth-friendly) and standardize cookie domain handling in one helper.
- [DONE] Refresh tokens are rotated on each `/refresh` (old session is revoked and `replacedBy` is set).
- [DONE] Implemented double-submit CSRF token check for defense-in-depth (cookie `mmCsrf` + header `x-csrf-token` on browser-origin POSTs to `/api/v1/auth/*`, plus GET `/api/v1/auth/csrf` bootstrap).

---

## 3. Type Safety & Validation
**Strengths:**
- `zod` schemas used for input validation.
- Type-safe database access via `drizzle-orm`.
- Explicit casting of IDs and roles.
- Consistent user DTO (`UserAuthData`).

**Recommendations:**
- [DONE] Centralized common Zod primitives for auth in `milemoto-serverside/src/routes/auth/validation.ts` and reused them across auth helpers/routes.

---

## 4. Error Handling
**Strengths:**
- `try/catch` blocks wrap async routes and pass errors to `next()`.
- Validation errors return 400 with descriptive messages.

**Recommendations:**
- [DONE] Centralized auth-route validation error responses via `milemoto-serverside/src/routes/auth/errors.ts` (`handleAuthRouteError`) and used it across auth routes.
- [DONE] Auth routes now log unexpected 5xx errors via `logger.error` in `milemoto-serverside/src/routes/auth/errors.ts`, and the global error handler skips duplicate logs when already logged.
- [DONE] OAuth callback errors now redirect to the frontend (no JSON error bodies) with explicit `error=` codes in `milemoto-serverside/src/routes/auth/oauth.route.ts`.

---

## 5. Maintainability & Readability
**Strengths:**
- Consistent naming conventions.
- Modular structure improves readability.
- Rate limiting middleware is well-organized.

**Recommendations:**
- [DONE] Refactored `/google/callback` into smaller helper functions (exchange/verify/resolve/session/MFA helpers) in `milemoto-serverside/src/routes/auth/oauth.route.ts`:
  - `resolveUserByGoogleSubOrEmail`
  - `createNewUserFromGoogle`
  - `createSessionAndSetCookie`
  - `handleMfaLogin`
  - Implemented via `milemoto-serverside/src/routes/auth/oauth.helpers.ts` (extracted helpers from the route file).

---

## 6. Suggested File Structure for Refactors
```
src/routes/auth/
  core.route.ts
  password.route.ts
  mfa.route.ts
  oauth.route.ts
  user.route.ts
  helpers/
    authMiddleware.ts   # contains requireAuth, requireRole, requirePermission, etc.
    oauthHelpers.ts    # resolveUser, createSession, handleMfaLogin
    validation.ts      # central zod schemas
```

---

## 7. Centralized Middleware Suggestion
```ts
// helpers/authMiddleware.ts
export function ensureUser() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ code: 'Unauthorized', message: 'Authentication required' });
    next();
  };
}
```
Use this instead of repeating `if (!req.user)` everywhere.

- [DONE] Implemented as `requireUser`/`getUserOrThrow` in `milemoto-serverside/src/routes/auth/auth.middleware.ts` and used across auth routes.

---

## 8. Summary of Improvements
- Refactor long OAuth callback function into smaller, testable helpers.
- Standardize error handling and logging.
- Consolidate common zod schemas.

With these refactors, the module would achieve **A+** maintainability and security standards while improving readability and testability.
