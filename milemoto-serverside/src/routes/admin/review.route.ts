import { Router } from 'express';
import { z } from 'zod';
import {
  AdminBulkModerateReviewsInput,
  AdminModerateReviewInput,
  AdminReviewsListQuery,
} from '@milemoto/types';
import { requirePermission } from '../../middleware/authz.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  deleteReviewAsAdmin,
  getAdminReviewById,
  listAdminReviews,
  bulkModerateReviews,
  moderateReview,
} from '../../services/reviews.service.js';
import { httpError } from '../../utils/error.js';

const reviewAdmin = Router();

reviewAdmin.get(
  '/',
  requirePermission('reviews.read'),
  asyncHandler(async (req, res) => {
    const query = AdminReviewsListQuery.parse(req.query);
    const result = await listAdminReviews(query);
    res.json(result);
  })
);

reviewAdmin.get(
  '/:id',
  requirePermission('reviews.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const result = await getAdminReviewById(id);
    res.json(result);
  })
);

reviewAdmin.post(
  '/bulk-moderate',
  requirePermission('reviews.manage'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw httpError(401, 'Unauthorized', 'Authentication required');
    const body = AdminBulkModerateReviewsInput.parse(req.body);
    const result = await bulkModerateReviews(body.reviewIds, Number(req.user.id), {
      status: body.status,
      note: body.note,
    });
    res.json(result);
  })
);

reviewAdmin.post(
  '/:id/moderate',
  requirePermission('reviews.manage'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw httpError(401, 'Unauthorized', 'Authentication required');
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const body = AdminModerateReviewInput.parse(req.body);
    const result = await moderateReview(id, Number(req.user.id), body);
    res.json(result);
  })
);

reviewAdmin.delete(
  '/:id',
  requirePermission('reviews.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await deleteReviewAsAdmin(id);
    res.status(204).send();
  })
);

export default reviewAdmin;
