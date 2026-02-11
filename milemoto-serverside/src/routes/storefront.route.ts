import { Router } from 'express';
import { z } from 'zod';
import { StorefrontListQuery } from '@milemoto/types';
import {
    listStorefrontProducts,
    getStorefrontProductBySlug,
    getStorefrontFilters,
} from '../services/storefront/read.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/error.js';

const router = Router();

// GET /storefront/products — Paginated product list
router.get(
    '/products',
    asyncHandler(async (req, res) => {
        const query = StorefrontListQuery.parse(req.query);
        const result = await listStorefrontProducts(query);
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
            throw httpError(404, 'NotFound', 'Product not found');
        }
        res.json(result);
    })
);

// GET /storefront/filters — Category/brand/grade filter options
router.get(
    '/filters',
    asyncHandler(async (_req, res) => {
        const result = await getStorefrontFilters();
        res.json(result);
    })
);

export { router as storefront };
