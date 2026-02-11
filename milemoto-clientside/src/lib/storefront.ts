// src/lib/storefront.ts
import { get } from './api';
import type {
    PaginatedStorefrontProducts,
    StorefrontProductDetail,
    StorefrontFiltersResponse,
} from '@/types';

const BASE = '/storefront';

/** Fetch paginated products with optional search, sort, and filters */
export function fetchProducts(params?: {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    sort?: 'newest' | 'price-asc' | 'price-desc' | 'name-asc' | undefined;
    categoryId?: number | number[] | undefined;
    subCategoryId?: number | number[] | undefined;
    brandId?: number | number[] | undefined;
    gradeId?: number | number[] | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
}): Promise<PaginatedStorefrontProducts> {
    const searchParams = new URLSearchParams();
    if (params) {
        if (params.page) searchParams.set('page', String(params.page));
        if (params.limit) searchParams.set('limit', String(params.limit));
        if (params.search) searchParams.set('search', params.search);
        if (params.sort) searchParams.set('sort', params.sort);
        if (params.minPrice !== undefined) searchParams.set('minPrice', String(params.minPrice));
        if (params.maxPrice !== undefined) searchParams.set('maxPrice', String(params.maxPrice));

        // Array params
        const arrayParams: [string, number | number[] | undefined][] = [
            ['categoryId', params.categoryId],
            ['subCategoryId', params.subCategoryId],
            ['brandId', params.brandId],
            ['gradeId', params.gradeId],
        ];
        for (const [key, val] of arrayParams) {
            if (val === undefined) continue;
            const ids = Array.isArray(val) ? val : [val];
            for (const id of ids) {
                searchParams.append(key, String(id));
            }
        }
    }

    const qs = searchParams.toString();
    return get<PaginatedStorefrontProducts>(`${BASE}/products${qs ? `?${qs}` : ''}`);
}

/** Fetch a single product by slug */
export function fetchProductBySlug(slug: string): Promise<StorefrontProductDetail> {
    return get<StorefrontProductDetail>(`${BASE}/products/${encodeURIComponent(slug)}`);
}

/** Fetch available filter options (categories, brands, grades) */
export function fetchFilters(): Promise<StorefrontFiltersResponse> {
    return get<StorefrontFiltersResponse>(`${BASE}/filters`);
}
