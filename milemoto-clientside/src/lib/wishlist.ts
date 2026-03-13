'use client';

import type { WishlistResponse } from '@milemoto/types';

import { authorizedDel, authorizedGet, authorizedPost } from '@/lib/api';

export const getWishlist = () => authorizedGet<WishlistResponse>('/wishlist');

export const addWishlistItem = (productSlug: string) =>
  authorizedPost<WishlistResponse>('/wishlist/items', { productSlug });

export const removeWishlistItemBySlug = (productSlug: string) =>
  authorizedDel<WishlistResponse>(`/wishlist/items/by-slug/${encodeURIComponent(productSlug)}`);

export const clearWishlist = () => authorizedDel<WishlistResponse>('/wishlist');

export const mergeWishlist = (productSlugs: string[]) =>
  authorizedPost<WishlistResponse>('/wishlist/merge', {
    items: productSlugs.map(productSlug => ({ productSlug })),
  });
