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

const router = Router();

router.get('/', requirePermission('vendors.read'), async (req, res, next) => {
  try {
    const query = ListQuery.parse(req.query);
    const result = await listVendors(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requirePermission('vendors.read'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await getVendor(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/', requirePermission('vendors.manage'), async (req, res, next) => {
  try {
    const body = CreateVendor.parse(req.body);
    const result = await createVendor(body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requirePermission('vendors.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdateVendor.parse(req.body);
    const result = await updateVendor(id, body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requirePermission('vendors.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await deleteVendor(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
