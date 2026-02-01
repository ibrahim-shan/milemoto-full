import { Router } from 'express';

import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import { CreateLanguage, UpdateLanguage, ListQuery } from './helpers/language.helpers.js';
import * as languageService from '../../services/language.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// ==== Endpoints =================================================

/**
 * POST /api/v1/admin/settings/languages
 * Create a new language
 */
router.post(
  '/',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const payload = CreateLanguage.parse(req.body);
    const item = await languageService.createLanguage(payload);
    res.status(201).json(item);
  })
);

/**
 * GET /api/v1/admin/settings/languages
 * List languages with pagination
 */
router.get(
  '/',
  requirePermission('settings.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await languageService.listLanguages(query);
    res.json(result);
  })
);

/**
 * PUT /api/v1/admin/settings/languages/:id
 * Update a language
 */
router.put(
  '/:id',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdateLanguage.parse(req.body);
    const updated = await languageService.updateLanguage(id, body);
    res.json(updated);
  })
);

/**
 * DELETE /api/v1/admin/settings/languages/:id
 * Delete a language
 */
router.delete(
  '/:id',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await languageService.deleteLanguage(id);
    res.status(204).end();
  })
);

export default router;
