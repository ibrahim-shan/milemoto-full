import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import {
  listWarranties,
  getWarranty,
  createWarranty,
  updateWarranty,
  deleteWarranty,
} from '../../services/warranty.service.js';
import { ListQuery, CreateWarranty, UpdateWarranty } from './helpers/warranty.helpers.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  requirePermission('warranties.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await listWarranties(query);
    res.json(result);
  })
);

router.get(
  '/:id',
  requirePermission('warranties.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await getWarranty(id);
    res.json(result);
  })
);

router.post(
  '/',
  requirePermission('warranties.manage'),
  asyncHandler(async (req, res) => {
    const body = CreateWarranty.parse(req.body);
    const result = await createWarranty(body);
    res.status(201).json(result);
  })
);

router.put(
  '/:id',
  requirePermission('warranties.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdateWarranty.parse(req.body);
    const result = await updateWarranty(id, body);
    res.json(result);
  })
);

router.delete(
  '/:id',
  requirePermission('warranties.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await deleteWarranty(id);
    res.status(204).send();
  })
);

export default router;
