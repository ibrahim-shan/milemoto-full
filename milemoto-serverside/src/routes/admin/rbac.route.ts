import { Router } from 'express';
import { requirePermission } from '../../middleware/authz.js';
import { CreateRoleSchema, UpdateRoleSchema } from './helpers/rbac.helpers.js';
import * as rbacService from '../../services/rbac.service.js';

const router = Router();

// GET /api/v1/admin/rbac/permissions
router.get('/permissions', requirePermission('rbac.read'), async (req, res, next) => {
  try {
    const perms = await rbacService.listPermissions();
    res.json(perms);
  } catch (e) {
    next(e);
  }
});

// GET /api/v1/admin/rbac/roles
router.get('/roles', requirePermission('rbac.read'), async (req, res, next) => {
  try {
    const search = req.query.search ? String(req.query.search) : undefined;
    const roles = await rbacService.listRoles(search);
    res.json(roles);
  } catch (e) {
    next(e);
  }
});

// GET /api/v1/admin/rbac/roles/:id
router.get('/roles/:id', requirePermission('rbac.read'), async (req, res, next) => {
  try {
    const role = await rbacService.getRole(Number(req.params.id));
    res.json(role);
  } catch (e) {
    next(e);
  }
});

// POST /api/v1/admin/rbac/roles
router.post('/roles', requirePermission('rbac.manage'), async (req, res, next) => {
  try {
    const body = CreateRoleSchema.parse(req.body);
    const role = await rbacService.createRole(body);
    res.status(201).json(role);
  } catch (e) {
    next(e);
  }
});

// PUT /api/v1/admin/rbac/roles/:id
router.put('/roles/:id', requirePermission('rbac.manage'), async (req, res, next) => {
  try {
    const body = UpdateRoleSchema.parse(req.body);
    const role = await rbacService.updateRole(Number(req.params.id), body);
    res.json(role);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/v1/admin/rbac/roles/:id
router.delete('/roles/:id', requirePermission('rbac.manage'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await rbacService.deleteRole(id);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
