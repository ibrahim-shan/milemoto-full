import { Router } from 'express';

import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import { CreateUnitGroup, UpdateUnitGroup, ListQuery } from './helpers/unit.helpers.js';
import {
  createUnitGroup,
  listUnitGroups,
  updateUnitGroup,
  deleteUnitGroup,
  getUnitGroup,
} from '../../services/unit.service.js';

const router = Router();

// Secure all routes

// ==== Endpoints =================================================

/**
 * POST /api/v1/admin/units
 * Create a new unit group
 */
router.post('/', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const payload = CreateUnitGroup.parse(req.body);
    const unit = await createUnitGroup(payload);
    res.status(201).json(unit);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/v1/admin/units
 * List unit groups with pagination
 */
router.get('/', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const query = ListQuery.parse(req.query);
    const result = await listUnitGroups(query);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/v1/admin/units/:id
 * Get a single unit group with details
 */
router.get('/:id', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const unit = await getUnitGroup(id);
    res.json(unit);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/v1/admin/units/:id
 * Update a unit group
 */
router.put('/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdateUnitGroup.parse(req.body);
    const updated = await updateUnitGroup(id, body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/v1/admin/units/:id
 * Delete a unit group
 */
router.delete('/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await deleteUnitGroup(id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
