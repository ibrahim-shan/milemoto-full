import { Router } from 'express';
import { z } from 'zod';
import { CustomerOrdersListQuery } from '@milemoto/types';
import { requireAuth } from '../middleware/authz.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getCustomerOrderById, listCustomerOrders } from '../services/orders/read.js';

export const orders = Router();

orders.use(requireAuth);

orders.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const query = CustomerOrdersListQuery.parse(req.query);
    const result = await listCustomerOrders(userId, query);
    res.json(result);
  })
);

orders.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await getCustomerOrderById(userId, id);
    res.json(result);
  })
);
