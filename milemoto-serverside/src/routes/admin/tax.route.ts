import { Router } from 'express';

import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import { CreateTax, UpdateTax, ListQuery } from './helpers/tax.helpers.js';
import { createTax, listTaxes, updateTax, deleteTax } from '../../services/tax.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// ==== Endpoints =================================================

/**
 * POST /api/v1/admin/taxes
 * Create a new tax
 */
router.post(
  '/',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const payload = CreateTax.parse(req.body);
    const tax = await createTax(payload);
    res.status(201).json(tax);
  })
);

/**
 * GET /api/v1/admin/taxes
 * List taxes with pagination
 */
router.get(
  '/',
  requirePermission('settings.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await listTaxes(query);
    res.json(result);
  })
);

/**
 * PUT /api/v1/admin/taxes/:id
 * Update a tax
 */
router.put(
  '/:id',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdateTax.parse(req.body);
    const updated = await updateTax(id, body);
    res.json(updated);
  })
);

/**
 * DELETE /api/v1/admin/taxes/:id
 * Delete a tax
 */
router.delete(
  '/:id',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await deleteTax(id);
    res.status(204).end();
  })
);

export default router;
