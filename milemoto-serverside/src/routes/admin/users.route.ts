import { Router, type Request } from 'express';
import * as userService from '../../services/admin-users.service.js';
import { requirePermission } from '../../middleware/authz.js';
import { CreateUserSchema, UpdateUserSchema } from '@milemoto/types';
import { httpError } from '../../utils/error.js';
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

// List Users
router.get(
  '/',
  requirePermission('users.read'),
  asyncHandler(async (req, res) => {
    const search = req.query.search ? String(req.query.search) : undefined;
    const users = await userService.listUsers(search);
    res.json(users);
  })
);

// Get User
router.get(
  '/:id',
  requirePermission('users.read'),
  asyncHandler(async (req, res) => {
    const user = await userService.getUser(Number(req.params.id));
    if (!user) {
      throw httpError(404, 'NotFound', 'User not found');
    }
    res.json(user);
  })
);

// Create User
router.post(
  '/',
  requirePermission('users.manage'),
  asyncHandler(async (req, res) => {
    const data = CreateUserSchema.parse(req.body);
    const newUser = await userService.createUser(data, getAuditContext(req));
    res.status(201).json(newUser);
  })
);

// Update User
router.put(
  '/:id',
  requirePermission('users.manage'),
  asyncHandler(async (req, res) => {
    const data = UpdateUserSchema.parse(req.body);
    const updated = await userService.updateUser(Number(req.params.id), data, getAuditContext(req));
    res.json(updated);
  })
);

// Delete User
router.delete(
  '/:id',
  requirePermission('users.manage'),
  asyncHandler(async (req, res) => {
    await userService.deleteUser(Number(req.params.id), getAuditContext(req));
    res.status(204).send();
  })
);

export default router;
