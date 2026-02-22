import { Router } from 'express';
import { requireAuth } from '../middleware/authz.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AddToCartInput, UpdateCartItemInput, MergeCartInput } from '@milemoto/types';
import * as cartService from '../services/cart.service.js';

export const cart = Router();

// All cart routes require authentication
cart.use(requireAuth);

// GET /cart — fetch current user's cart with live prices and stock
cart.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const data = await cartService.getCart(userId);
    res.json(data);
  })
);

// POST /cart/items — add a variant to cart
cart.post(
  '/items',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const body = AddToCartInput.parse(req.body);
    const data = await cartService.addItem(userId, body);
    res.status(201).json(data);
  })
);

// PATCH /cart/items/:id — update item quantity (0 = remove)
cart.patch(
  '/items/:id',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const itemId = Number(req.params.id);
    const body = UpdateCartItemInput.parse(req.body);
    const data = await cartService.updateItemQty(userId, itemId, body.quantity);
    res.json(data);
  })
);

// DELETE /cart/items/:id — remove a specific item
cart.delete(
  '/items/:id',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const itemId = Number(req.params.id);
    const data = await cartService.removeItem(userId, itemId);
    res.json(data);
  })
);

// DELETE /cart — clear entire cart
cart.delete(
  '/',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const data = await cartService.clearCart(userId);
    res.json(data);
  })
);

// POST /cart/merge — merge guest localStorage cart into server cart
cart.post(
  '/merge',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const body = MergeCartInput.parse(req.body);
    const data = await cartService.mergeGuestCart(userId, body);
    res.json(data);
  })
);

// POST /cart/validate — validate cart items (stock, availability)
cart.post(
  '/validate',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const data = await cartService.validateCart(userId);
    res.json(data);
  })
);
