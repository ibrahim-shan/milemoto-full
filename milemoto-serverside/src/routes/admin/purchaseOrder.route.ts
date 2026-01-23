import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import { httpError } from '../../utils/error.js';
import {
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  rejectPurchaseOrder,
  closePurchaseOrder,
} from '../../services/purchaseOrder.service.js';
import {
  ListQuery,
  CreatePurchaseOrder,
  UpdatePurchaseOrder,
} from './helpers/purchaseOrder.helpers.js';

const router = Router();

router.get('/', requirePermission('purchase_orders.read'), async (req, res, next) => {
  try {
    const query = ListQuery.parse(req.query);
    const result = await listPurchaseOrders(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requirePermission('purchase_orders.read'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await getPurchaseOrder(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/', requirePermission('purchase_orders.manage'), async (req, res, next) => {
  try {
    const body = CreatePurchaseOrder.parse(req.body);
    if (!req.user) {
      throw httpError(401, 'Unauthorized', 'Authentication required');
    }
    const userId = Number(req.user.id);
    const result = await createPurchaseOrder(body, userId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requirePermission('purchase_orders.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdatePurchaseOrder.parse(req.body);
    const result = await updatePurchaseOrder(id, body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/submit', requirePermission('purchase_orders.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await submitPurchaseOrder(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/approve', requirePermission('purchase_orders.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    if (!req.user) {
      throw httpError(401, 'Unauthorized', 'Authentication required');
    }
    const approverId = Number(req.user.id);
    const result = await approvePurchaseOrder(id, approverId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', requirePermission('purchase_orders.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await cancelPurchaseOrder(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reject', requirePermission('purchase_orders.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    if (!req.user) {
      throw httpError(401, 'Unauthorized', 'Authentication required');
    }
    const userId = Number(req.user.id);
    const result = await rejectPurchaseOrder(id, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/close', requirePermission('purchase_orders.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    if (!req.user) {
      throw httpError(401, 'Unauthorized', 'Authentication required');
    }
    const result = await closePurchaseOrder(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
