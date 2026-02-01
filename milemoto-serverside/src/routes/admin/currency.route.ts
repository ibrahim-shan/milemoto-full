import { Router } from 'express';

import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import { CreateCurrency, UpdateCurrency, ListQuery } from './helpers/currency.helpers.js';
import {
  createCurrency,
  listCurrencies,
  updateCurrency,
  deleteCurrency,
  listAllCurrencies,
} from '../../services/currency.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

/**
 * POST /api/v1/admin/currencies
 * Create a new currency
 */
router.post(
  '/',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const payload = CreateCurrency.parse(req.body);
    const currency = await createCurrency(payload);
    res.status(201).json(currency);
  })
);

/**
 * GET /api/v1/admin/currencies
 * List currencies with pagination
 */
router.get(
  '/',
  requirePermission('settings.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await listCurrencies(query);
    res.json(result);
  })
);

/**
 * GET /api/v1/admin/currencies/all
 * Simple list for dropdowns
 */
router.get(
  '/all',
  requirePermission('settings.read'),
  asyncHandler(async (req, res) => {
    const includeInactive = ['1', 'true', 'yes'].includes(
      String(req.query.includeInactive ?? '').toLowerCase()
    );
    const items = await listAllCurrencies(includeInactive);
    res.json({ items });
  })
);

/**
 * PUT /api/v1/admin/currencies/:id
 * Update a currency
 */
router.put(
  '/:id',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdateCurrency.parse(req.body);
    const updated = await updateCurrency(id, body);
    res.json(updated);
  })
);

/**
 * DELETE /api/v1/admin/currencies/:id
 * Delete a currency
 */
router.delete(
  '/:id',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await deleteCurrency(id);
    res.json(result);
  })
);

export default router;
