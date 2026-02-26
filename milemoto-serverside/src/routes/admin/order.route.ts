import { Router } from 'express';
import { z } from 'zod';
import { AdminOrdersListQuery } from '@milemoto/types';
import { requirePermission } from '../../middleware/authz.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getAdminOrderById, listAdminOrders } from '../../services/orders/read.js';

const orderAdmin = Router();

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

export default orderAdmin;
