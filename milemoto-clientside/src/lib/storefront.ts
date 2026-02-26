// src/lib/storefront.ts
import { get } from './api';

import type {
  PaginatedStorefrontProducts,
  StorefrontFiltersResponse,
  StorefrontListQueryDto,
  StorefrontProductDetail,
} from '@/types';

const BASE = '/storefront';

/**
 * Server-side GET — uses an absolute URL suitable for Node.js fetch in server components.
 * INTERNAL_API_BASE must be an absolute URL (e.g. http://localhost:4000/api/v1).
 * Falls back to NEXT_PUBLIC_API_BASE which works if it is already absolute.
 */
async function serverGet<T>(path: string, revalidate = 60): Promise<T> {
  const rawBase =
    process.env.INTERNAL_API_BASE ??
    process.env.NEXT_PUBLIC_API_BASE ??
    'http://localhost:4000/api/v1';
  const base = rawBase.replace(/\/+$/, '');
  const apiBase = base.endsWith('/api')
    ? `${base}/v1`
    : base.includes('/api/v1')
      ? base
      : `${base}/v1`;

  const res = await fetch(`${apiBase}${path}`, {
    next: { revalidate },
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`[serverGet] ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

/** Fetch paginated products with optional search, sort, and filters */
export function fetchProducts(
  params?: {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    sort?: 'newest' | 'price-asc' | 'price-desc' | 'name-asc' | undefined;
    isFeatured?: boolean | undefined;
    categoryId?: number | number[] | undefined;
    subCategoryId?: number | number[] | undefined;
    brandId?: number | number[] | undefined;
    gradeId?: number | number[] | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
  },
  init?: RequestInit,
): Promise<PaginatedStorefrontProducts> {
  const searchParams = new URLSearchParams();
  if (params) {
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search) searchParams.set('search', params.search);
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.isFeatured !== undefined) searchParams.set('isFeatured', String(params.isFeatured));
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
  return get<PaginatedStorefrontProducts>(`${BASE}/products${qs ? `?${qs}` : ''}`, init ?? {});
}

export function serverFetchProducts(
  params?: StorefrontListQueryDto,
  revalidate = 60,
): Promise<PaginatedStorefrontProducts> {
  const searchParams = new URLSearchParams();
  if (params) {
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search) searchParams.set('search', params.search);
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.isFeatured !== undefined) searchParams.set('isFeatured', String(params.isFeatured));
    if (params.minPrice !== undefined) searchParams.set('minPrice', String(params.minPrice));
    if (params.maxPrice !== undefined) searchParams.set('maxPrice', String(params.maxPrice));

    const arrayParams: [string, number | number[] | undefined][] = [
      ['categoryId', params.categoryId],
      ['subCategoryId', params.subCategoryId],
      ['brandId', params.brandId],
      ['gradeId', params.gradeId],
    ];
    for (const [key, val] of arrayParams) {
      if (val === undefined) continue;
      const ids = Array.isArray(val) ? val : [val];
      for (const id of ids) searchParams.append(key, String(id));
    }
  }

  const qs = searchParams.toString();
  return serverGet<PaginatedStorefrontProducts>(`${BASE}/products${qs ? `?${qs}` : ''}`, revalidate);
}

/** Fetch a single product by slug */
export function fetchProductBySlug(slug: string): Promise<StorefrontProductDetail> {
  return get<StorefrontProductDetail>(`${BASE}/products/${encodeURIComponent(slug)}`);
}

/** Fetch available filter options (categories, brands, grades) */
export function fetchFilters(): Promise<StorefrontFiltersResponse> {
  return get<StorefrontFiltersResponse>(`${BASE}/filters`);
}

export function serverFetchFilters(revalidate = 60): Promise<StorefrontFiltersResponse> {
  return serverGet<StorefrontFiltersResponse>(`${BASE}/filters`, revalidate);
}

/**
 * Server-component variant of fetchProductBySlug.
 * Uses an absolute URL so it works in Next.js server components (Node.js fetch).
 * Revalidates every 60 seconds by default.
 */
export function serverFetchProductBySlug(
  slug: string,
  revalidate = 60,
): Promise<StorefrontProductDetail> {
  return serverGet<StorefrontProductDetail>(
    `${BASE}/products/${encodeURIComponent(slug)}`,
    revalidate,
  );
}
