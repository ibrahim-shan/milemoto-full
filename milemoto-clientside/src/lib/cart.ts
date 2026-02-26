// src/lib/cart.ts
import { authorizedDel, authorizedGet, authorizedPatch, authorizedPost } from './api';

export type GuestCartItem = {
  productVariantId: number;
  quantity: number;
};

export type AddServerCartItemInput = {
  productVariantId: number;
  quantity: number;
};

/** Shape returned by GET /cart on the server */
export type ServerCartItem = {
  id: number;
  productVariantId: number;
  quantity: number;
  variantName: string;
  price: number; // dollars (e.g. 29.99)
  productName: string;
  productSlug: string;
  imageSrc: string | null;
  available: number;
  warning?: string;
};

export type ServerCartResponse = {
  id: number;
  items: ServerCartItem[];
  itemCount: number;
  subtotal: number;
  warnings: string[];
};

/**
 * Merge a guest (localStorage) cart into the authenticated user's server cart.
 * Only sends items that have a productVariantId (server requires it).
 * Returns true if the merge succeeded (or there was nothing to merge),
 * false if the server request failed — so the caller can decide whether to clear local cart.
 */
export async function mergeGuestCart(items: GuestCartItem[]): Promise<boolean> {
  if (!items.length) return true; // nothing to merge = success
  try {
    await authorizedPost('/cart/merge', { items });
    return true;
  } catch (err) {
    console.warn('[cart] mergeGuestCart failed silently:', err);
    return false;
  }
}

/**
 * Fetch the authenticated user's server cart.
 * Returns null silently on failure.
 */
export async function fetchServerCart(): Promise<ServerCartResponse | null> {
  try {
    return await authorizedGet<ServerCartResponse>('/cart');
  } catch (err) {
    console.warn('[cart] fetchServerCart failed silently:', err);
    return null;
  }
}

/**
 * Add/update an item in the authenticated user's server cart.
 * Returns the updated server cart on success, null on failure.
 */
export async function addServerCartItem(
  input: AddServerCartItemInput,
): Promise<ServerCartResponse | null> {
  try {
    return await authorizedPost<ServerCartResponse>('/cart/items', input);
  } catch (err) {
    console.warn('[cart] addServerCartItem failed:', err);
    throw err;
  }
}

export async function setServerCartItemQty(
  itemId: number,
  quantity: number,
): Promise<ServerCartResponse | null> {
  try {
    return await authorizedPatch<ServerCartResponse>(`/cart/items/${itemId}`, { quantity });
  } catch (err) {
    console.warn('[cart] setServerCartItemQty failed:', err);
    throw err;
  }
}

export async function removeServerCartItem(itemId: number): Promise<ServerCartResponse | null> {
  try {
    return await authorizedDel<ServerCartResponse>(`/cart/items/${itemId}`);
  } catch (err) {
    console.warn('[cart] removeServerCartItem failed:', err);
    throw err;
  }
}

export async function clearServerCart(): Promise<ServerCartResponse | null> {
  try {
    return await authorizedDel<ServerCartResponse>('/cart');
  } catch (err) {
    console.warn('[cart] clearServerCart failed:', err);
    throw err;
  }
}
