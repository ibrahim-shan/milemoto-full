import { Router } from 'express';
import { AddWishlistItemInput, MergeWishlistInput } from '@milemoto/types';
import { requireAuth } from '../middleware/authz.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as wishlistService from '../services/wishlist.service.js';

export const wishlist = Router();

wishlist.use(requireAuth);

wishlist.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const data = await wishlistService.getWishlist(userId);
    res.json(data);
  })
);

wishlist.post(
  '/items',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const body = AddWishlistItemInput.parse(req.body);
    const data = await wishlistService.addWishlistItem(userId, body);
    res.status(201).json(data);
  })
);

wishlist.delete(
  '/items/by-slug/:slug',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const data = await wishlistService.removeWishlistItemBySlug(
      userId,
      String(req.params.slug || '')
    );
    res.json(data);
  })
);

wishlist.delete(
  '/',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const data = await wishlistService.clearWishlist(userId);
    res.json(data);
  })
);

wishlist.post(
  '/merge',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const body = MergeWishlistInput.parse(req.body);
    const data = await wishlistService.mergeWishlist(userId, body);
    res.json(data);
  })
);
