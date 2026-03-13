import { Router } from 'express';
import { z } from 'zod';
import { AdminOrdersListQuery } from '@milemoto/types';
import { requirePermission } from '../../middleware/authz.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  getAdminOrderById,
  getAdminOrderFilterOptions,
  listAdminOrders,
} from '../../services/orders/read.js';
import {
  cancelAdminOrder,
  confirmAdminOrder,
  deliverAdminOrder,
  processAdminOrder,
  shipAdminOrder,
} from '../../services/orders/write.js';
import { httpError } from '../../utils/error.js';

const orderAdmin = Router();
const TransitionBody = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});

orderAdmin.get(
  '/filter-options',
  requirePermission('orders.read'),
  asyncHandler(async (_req, res) => {
    const result = await getAdminOrderFilterOptions();
    res.json(result);
  })
);

orderAdmin.get(
  '/',
  requirePermission('orders.read'),
  asyncHandler(async (req, res) => {
    const query = AdminOrdersListQuery.parse(req.query);
    const result = await listAdminOrders(query);
    res.json(result);
  })
);

orderAdmin.get(
  '/:id',
  requirePermission('orders.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await getAdminOrderById(id);
    res.json(result);
  })
);

orderAdmin.post(
  '/:id/confirm',
  requirePermission('orders.manage'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw httpError(401, 'Unauthorized', 'Authentication required');
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = TransitionBody.parse(req.body ?? {});
    await confirmAdminOrder(id, Number(req.user.id), body.reason);
    const result = await getAdminOrderById(id);
    res.json(result);
  })
);

orderAdmin.post(
  '/:id/process',
  requirePermission('orders.manage'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw httpError(401, 'Unauthorized', 'Authentication required');
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = TransitionBody.parse(req.body ?? {});
    await processAdminOrder(id, Number(req.user.id), body.reason);
    const result = await getAdminOrderById(id);
    res.json(result);
  })
);

orderAdmin.post(
  '/:id/ship',
  requirePermission('orders.manage'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw httpError(401, 'Unauthorized', 'Authentication required');
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = TransitionBody.parse(req.body ?? {});
    await shipAdminOrder(id, Number(req.user.id), body.reason);
    const result = await getAdminOrderById(id);
    res.json(result);
  })
);

orderAdmin.post(
  '/:id/deliver',
  requirePermission('orders.manage'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw httpError(401, 'Unauthorized', 'Authentication required');
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = TransitionBody.parse(req.body ?? {});
    await deliverAdminOrder(id, Number(req.user.id), body.reason);
    const result = await getAdminOrderById(id);
    res.json(result);
  })
);

orderAdmin.post(
  '/:id/cancel',
  requirePermission('orders.manage'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw httpError(401, 'Unauthorized', 'Authentication required');
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = TransitionBody.parse(req.body ?? {});
    await cancelAdminOrder(id, Number(req.user.id), body.reason);
    const result = await getAdminOrderById(id);
    res.json(result);
  })
);

export default orderAdmin;
