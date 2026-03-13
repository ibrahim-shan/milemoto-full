import { Router } from 'express';
import { z } from 'zod';
import {
  CancelCustomerOrderRequestInput,
  CreateOrderRequestInput,
  CustomerOrdersListQuery,
  CustomerOrderRequestsListQuery,
} from '@milemoto/types';
import { requireAuth } from '../middleware/authz.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getCustomerOrderById, listCustomerOrders } from '../services/orders/read.js';
import { httpError } from '../utils/error.js';
import {
  cancelCustomerOrderRequest,
  createCustomerOrderRequest,
  listCustomerOrderRequestsForOrder,
  listMyOrderRequests,
} from '../services/orders/requests.js';

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
  '/requests/mine',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const query = CustomerOrderRequestsListQuery.parse(req.query);
    const result = await listMyOrderRequests(userId, query);
    res.json(result);
  })
);

orders.get(
  '/:id/requests',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const query = CustomerOrderRequestsListQuery.parse(req.query);
    const result = await listCustomerOrderRequestsForOrder(userId, id, query);
    res.json(result);
  })
);

orders.post(
  '/requests/:id/cancel',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = CancelCustomerOrderRequestInput.parse(req.body ?? {});
    const result = await cancelCustomerOrderRequest(userId, id, body.reason, {
      userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json(result);
  })
);

orders.post(
  '/:id/requests',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = CreateOrderRequestInput.parse(req.body ?? {});
    const result = await createCustomerOrderRequest(userId, id, body, {
      userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(201).json(result);
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

orders.post(
  '/:id/cancel',
  asyncHandler(async (req) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    throw httpError(
      410,
      'DeprecatedEndpoint',
      `Direct order cancellation is disabled. Submit a cancellation request via POST /orders/${id}/requests with { "type": "cancel", "reason": "..." }.`
    );
  })
);
