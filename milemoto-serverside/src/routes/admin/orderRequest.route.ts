import { Router } from 'express';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  AdminOrderRequestsListQuery,
  CompleteOrderRequestInput,
  DecideOrderRequestInput,
} from '@milemoto/types';
import { stocklocations } from '@milemoto/types';
import { requirePermission } from '../../middleware/authz.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { httpError } from '../../utils/error.js';
import { db } from '../../db/drizzle.js';
import {
  completeAdminOrderRequest,
  decideAdminOrderRequest,
  getAdminOrderRequestById,
  listAdminOrderRequests,
} from '../../services/orders/requests.js';

const orderRequestAdmin = Router();

orderRequestAdmin.get(
  '/',
  requirePermission('orders.read'),
  asyncHandler(async (req, res) => {
    const query = AdminOrderRequestsListQuery.parse(req.query);
    const result = await listAdminOrderRequests(query);
    res.json(result);
  })
);

orderRequestAdmin.get(
  '/restock-locations',
  requirePermission('orders.read'),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        id: stocklocations.id,
        name: stocklocations.name,
        status: stocklocations.status,
      })
      .from(stocklocations)
      .where(eq(stocklocations.status, 'active'))
      .orderBy(asc(stocklocations.name), asc(stocklocations.id));
    res.json({ items: rows });
  })
);

orderRequestAdmin.get(
  '/:id',
  requirePermission('orders.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await getAdminOrderRequestById(id);
    res.json(result);
  })
);

orderRequestAdmin.post(
  '/:id/decide',
  requirePermission('orders.manage'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw httpError(401, 'Unauthorized', 'Authentication required');
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = DecideOrderRequestInput.parse(req.body ?? {});
    const actorUserId = Number(req.user.id);
    const result = await decideAdminOrderRequest(id, actorUserId, body, {
      userId: actorUserId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json(result);
  })
);

orderRequestAdmin.post(
  '/:id/complete',
  requirePermission('orders.manage'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw httpError(401, 'Unauthorized', 'Authentication required');
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = CompleteOrderRequestInput.parse(req.body ?? {});
    const actorUserId = Number(req.user.id);
    const result = await completeAdminOrderRequest(id, actorUserId, body, {
      userId: actorUserId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json(result);
  })
);

export default orderRequestAdmin;
