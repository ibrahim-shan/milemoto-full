import { Router } from 'express';
import { z } from 'zod';
import { SubmitProductReviewInput, UpdateProductReviewInput } from '@milemoto/types';
import { requireAuth } from '../middleware/authz.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  deleteMyProductReview,
  getMyProductReviewById,
  getMyProductReviewEligibility,
  listMyReviews,
  submitProductReview,
  updateMyProductReview,
} from '../services/reviews.service.js';
import { reviewWriteLimiter } from '../middleware/rateLimit.js';

export const reviews = Router();

reviews.use(requireAuth);

reviews.get(
  '/mine',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const result = await listMyReviews(userId);
    res.json({ items: result });
  })
);

reviews.get(
  '/mine/:id',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const reviewId = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await getMyProductReviewById(userId, reviewId);
    res.json(result);
  })
);

reviews.get(
  '/eligibility/:productId',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const productId = z.coerce.number().int().min(1).parse(req.params.productId);
    const result = await getMyProductReviewEligibility(userId, productId);
    res.json(result);
  })
);

reviews.post(
  '/',
  reviewWriteLimiter,
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const body = SubmitProductReviewInput.parse(req.body);
    const result = await submitProductReview(userId, body);
    res.status(201).json(result);
  })
);

reviews.patch(
  '/:id',
  reviewWriteLimiter,
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const reviewId = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdateProductReviewInput.parse(req.body);
    const result = await updateMyProductReview(userId, reviewId, body);
    res.json(result);
  })
);

reviews.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const reviewId = z.coerce.number().int().min(1).parse(req.params.id);
    await deleteMyProductReview(userId, reviewId);
    res.status(204).send();
  })
);
