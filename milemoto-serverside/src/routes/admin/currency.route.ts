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

const router = Router();

// Secure all routes

// ==== Endpoints =================================================

/**
 * POST /api/v1/admin/currencies
 * Create a new currency
 */
router.post('/', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const payload = CreateCurrency.parse(req.body);
    const currency = await createCurrency(payload);
    res.status(201).json(currency);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/v1/admin/currencies
 * List currencies with pagination
 */
router.get('/', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const query = ListQuery.parse(req.query);
    const result = await listCurrencies(query);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/v1/admin/currencies/all
 * Simple list for dropdowns
 */
router.get('/all', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const includeInactive = ['1', 'true', 'yes'].includes(
      String(req.query.includeInactive ?? '').toLowerCase()
    );
    const items = await listAllCurrencies(includeInactive);
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/v1/admin/currencies/:id
 * Update a currency
 */
router.put('/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdateCurrency.parse(req.body);
    const updated = await updateCurrency(id, body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/v1/admin/currencies/:id
 * Delete a currency
 */
router.delete('/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await deleteCurrency(id);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

export default router;
