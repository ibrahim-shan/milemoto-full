// src/routes/auth/core.route.ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/authz.js';
import { loginByIpLimiter, loginByEmailLimiter } from '../../middleware/rateLimit.js';
import { Login, Register } from '../helpers/auth.helpers.js';
import { getUserOrThrow, requireUser } from './auth.middleware.js';
import { handleAuthRouteError } from './errors.js';
import * as authService from '../../services/auth.service.js';
import * as rbacService from '../../services/rbac.service.js';

export const coreAuth = Router();

/** GET /api/v1/auth/permissions */
coreAuth.get('/permissions', requireAuth, requireUser, async (req, res, next) => {
  try {
    const user = getUserOrThrow(req);
    const permissions = await rbacService.getUserPermissions(Number(user.id));
    res.json({ permissions });
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

/** POST /api/v1/auth/register */
coreAuth.post('/register', async (req, res, next) => {
  try {
    const data = Register.parse(req.body);
    const result = await authService.register(data);
    res.status(201).json(result);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

/** POST /api/v1/auth/login */
coreAuth.post('/login', loginByIpLimiter, loginByEmailLimiter, async (req, res, next) => {
  try {
    const data = Login.parse(req.body);
    const result = await authService.login(data, req, res);
    res.json(result);
  } catch (e) {
    handleAuthRouteError(e, req, res, next);
  }
});

/** POST /api/v1/auth/refresh */
coreAuth.post('/refresh', async (req, res, next) => {
  try {
    const result = await authService.refresh(req, res);
    res.json(result);
  } catch (error) {
    handleAuthRouteError(error, req, res, next);
  }
});

/** POST /api/v1/auth/logout */
coreAuth.post('/logout', async (req, res, next) => {
  try {
    await authService.logout(req, res);
    res.status(204).end();
  } catch (e) {
    // If token is invalid, we still want to clear cookies (which logout does)
    // but the service throws 401 if token is invalid.
    // The original code returned 401.
    handleAuthRouteError(e, req, res, next);
  }
});

/** POST /api/v1/auth/logout-all */
coreAuth.post('/logout-all', requireAuth, requireUser, async (req, res, next) => {
  try {
    const userId = String(getUserOrThrow(req).id);
    await authService.logoutAll(userId, res);
    return res.status(204).end();
  } catch (e) {
    return handleAuthRouteError(e, req, res, next);
  }
});
