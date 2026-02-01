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
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// ==== Endpoints =================================================

/**
 * POST /api/v1/admin/units
 * Create a new unit group
 */
router.post(
  '/',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const payload = CreateUnitGroup.parse(req.body);
    const unit = await createUnitGroup(payload);
    res.status(201).json(unit);
  })
);

/**
 * GET /api/v1/admin/units
 * List unit groups with pagination
 */
router.get(
  '/',
  requirePermission('settings.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await listUnitGroups(query);
    res.json(result);
  })
);

/**
 * GET /api/v1/admin/units/:id
 * Get a single unit group with details
 */
router.get(
  '/:id',
  requirePermission('settings.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const unit = await getUnitGroup(id);
    res.json(unit);
  })
);

/**
 * PUT /api/v1/admin/units/:id
 * Update a unit group
 */
router.put(
  '/:id',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdateUnitGroup.parse(req.body);
    const updated = await updateUnitGroup(id, body);
    res.json(updated);
  })
);

/**
 * DELETE /api/v1/admin/units/:id
 * Delete a unit group
 */
router.delete(
  '/:id',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await deleteUnitGroup(id);
    res.status(204).end();
  })
);

export default router;
