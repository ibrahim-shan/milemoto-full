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

const router = Router();

router.get('/', requirePermission('warranties.read'), async (req, res, next) => {
  try {
    const query = ListQuery.parse(req.query);
    const result = await listWarranties(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requirePermission('warranties.read'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await getWarranty(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/', requirePermission('warranties.manage'), async (req, res, next) => {
  try {
    const body = CreateWarranty.parse(req.body);
    const result = await createWarranty(body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requirePermission('warranties.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdateWarranty.parse(req.body);
    const result = await updateWarranty(id, body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requirePermission('warranties.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await deleteWarranty(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
