import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import {
  listVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
} from '../../services/vendor.service.js';
import { ListQuery, CreateVendor, UpdateVendor } from './helpers/vendor.helpers.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  requirePermission('vendors.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await listVendors(query);
    res.json(result);
  })
);

router.get(
  '/:id',
  requirePermission('vendors.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await getVendor(id);
    res.json(result);
  })
);

router.post(
  '/',
  requirePermission('vendors.manage'),
  asyncHandler(async (req, res) => {
    const body = CreateVendor.parse(req.body);
    const result = await createVendor(body);
    res.status(201).json(result);
  })
);

router.put(
  '/:id',
  requirePermission('vendors.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdateVendor.parse(req.body);
    const result = await updateVendor(id, body);
    res.json(result);
  })
);

router.delete(
  '/:id',
  requirePermission('vendors.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await deleteVendor(id);
    res.status(204).send();
  })
);

export default router;
