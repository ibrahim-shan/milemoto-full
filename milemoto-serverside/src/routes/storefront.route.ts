import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { StorefrontListQuery } from '@milemoto/types';
import {
  listStorefrontProducts,
  getStorefrontProductBySlug,
  getStorefrontProductStatusBySlug,
  getStorefrontFilters,
} from '../services/storefront/read.js';
import { getStorefrontProductReviewsBySlug } from '../services/reviews.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/error.js';

const router = Router();

/**
 * Set HTTP caching headers for public, read-only storefront data.
 * max-age: browsers/CDN serve cache for 60s without revalidating.
 * stale-while-revalidate: CDN serves stale for up to 5 min while fetching fresh in background.
 */
function setPublicCache(res: Response, maxAge = 60, swr = 300) {
  res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
}

// GET /storefront/products — Paginated product list
router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const query = StorefrontListQuery.parse(req.query);
    const result = await listStorefrontProducts(query);
    setPublicCache(res); // 60s fresh, 5 min stale-while-revalidate
    res.json(result);
  })
);

// GET /storefront/products/:slug — Single product by slug
router.get(
  '/products/:slug',
  asyncHandler(async (req, res) => {
    const slug = z.string().min(1).parse(req.params.slug);
    const result = await getStorefrontProductBySlug(slug);
    if (!result) {
      const status = await getStorefrontProductStatusBySlug(slug);
      if (status === 'inactive') {
        throw httpError(410, 'ProductUnavailable', 'Product is unavailable');
      }
      throw httpError(404, 'NotFound', 'Product not found');
    }
    setPublicCache(res, 60, 600); // 60s fresh, 10 min stale for individual products
    res.json(result);
  })
);

// GET /storefront/products/:slug/reviews — Approved product reviews
router.get(
  '/products/:slug/reviews',
  asyncHandler(async (req, res) => {
    const slug = z.string().min(1).parse(req.params.slug);
    const result = await getStorefrontProductReviewsBySlug(slug);
    setPublicCache(res, 30, 120);
    res.json(result);
  })
);

// GET /storefront/filters — Category/brand/grade filter options
router.get(
  '/filters',
  asyncHandler(async (_req, res) => {
    const result = await getStorefrontFilters();
    setPublicCache(res, 120, 600); // Filters change rarely — 2 min fresh, 10 min stale
    res.json(result);
  })
);

export { router as storefront };
