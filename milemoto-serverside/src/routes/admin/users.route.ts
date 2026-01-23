import { Router } from 'express';
import * as userService from '../../services/admin-users.service.js';
import { requirePermission } from '../../middleware/authz.js';
import { CreateUserSchema, UpdateUserSchema } from '@milemoto/types';
import { httpError } from '../../utils/error.js';

const router = Router();

// List Users
router.get('/', requirePermission('users.read'), async (req, res, next) => {
  try {
    const search = req.query.search ? String(req.query.search) : undefined;
    const users = await userService.listUsers(search);
    res.json(users);
  } catch (e) {
    next(e);
  }
});

// Get User
router.get('/:id', requirePermission('users.read'), async (req, res, next) => {
  try {
    const user = await userService.getUser(Number(req.params.id));
    if (!user) {
      throw httpError(404, 'NotFound', 'User not found');
    }
    res.json(user);
  } catch (e) {
    next(e);
  }
});

// Create User
router.post('/', requirePermission('users.manage'), async (req, res, next) => {
  try {
    const data = CreateUserSchema.parse(req.body);
    const newUser = await userService.createUser(data);
    res.status(201).json(newUser);
  } catch (e) {
    next(e);
  }
});

// Update User
router.put('/:id', requirePermission('users.manage'), async (req, res, next) => {
  try {
    const data = UpdateUserSchema.parse(req.body);
    const updated = await userService.updateUser(Number(req.params.id), data);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// Delete User
router.delete('/:id', requirePermission('users.manage'), async (req, res, next) => {
  try {
    await userService.deleteUser(Number(req.params.id));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
