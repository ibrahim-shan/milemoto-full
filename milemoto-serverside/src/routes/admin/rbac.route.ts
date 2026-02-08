import { Router, type Request } from 'express';
import { requirePermission } from '../../middleware/authz.js';
import { CreateRoleSchema, UpdateRoleSchema } from './helpers/rbac.helpers.js';
import * as rbacService from '../../services/rbac.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { AuditContext } from '../../services/adminUsers/write.js';

const router = Router();

// Helper to extract audit context from request
function getAuditContext(req: Request): AuditContext {
  return {
    userId: Number(req.user?.id ?? 0),
    ipAddress: req.ip ?? undefined,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

// GET /api/v1/admin/rbac/permissions
router.get(
  '/permissions',
  requirePermission('rbac.read'),
  asyncHandler(async (_req, res) => {
    const perms = await rbacService.listPermissions();
    res.json(perms);
  })
);

// GET /api/v1/admin/rbac/roles
router.get(
  '/roles',
  requirePermission('rbac.read'),
  asyncHandler(async (req, res) => {
    const search = req.query.search ? String(req.query.search) : undefined;
    const roles = await rbacService.listRoles(search);
    res.json(roles);
  })
);

// GET /api/v1/admin/rbac/roles/:id
router.get(
  '/roles/:id',
  requirePermission('rbac.read'),
  asyncHandler(async (req, res) => {
    const role = await rbacService.getRole(Number(req.params.id));
    res.json(role);
  })
);

// POST /api/v1/admin/rbac/roles
router.post(
  '/roles',
  requirePermission('rbac.manage'),
  asyncHandler(async (req, res) => {
    const body = CreateRoleSchema.parse(req.body);
    const role = await rbacService.createRole(body, getAuditContext(req));
    res.status(201).json(role);
  })
);

// PUT /api/v1/admin/rbac/roles/:id
router.put(
  '/roles/:id',
  requirePermission('rbac.manage'),
  asyncHandler(async (req, res) => {
    const body = UpdateRoleSchema.parse(req.body);
    const role = await rbacService.updateRole(Number(req.params.id), body, getAuditContext(req));
    res.json(role);
  })
);

// DELETE /api/v1/admin/rbac/roles/:id
router.delete(
  '/roles/:id',
  requirePermission('rbac.manage'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await rbacService.deleteRole(id, getAuditContext(req));
    res.json({ success: true });
  })
);

export default router;
