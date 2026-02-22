import { eq, and, sql, inArray } from 'drizzle-orm';
import { carts, cartitems, productvariants, products, stocklevels } from '@milemoto/types';
import type { AddToCartDto, MergeCartDto, CartResponse } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { getCart } from './read.js';

const MAX_UNIQUE_ITEMS = 50;
const MAX_QTY = 999;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get or create a cart for the user. Returns the cart ID.
 */
async function getOrCreateCart(userId: number): Promise<number> {
  const [existing] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  if (existing) return existing.id;

  const [result] = await db.insert(carts).values({ userId }).$returningId();
  return result!.id;
}

/**
 * Calculate available stock for a variant (onHand - allocated across all locations).
 */
async function getAvailableStock(variantId: number): Promise<number> {
  const [row] = await db
    .select({
      available: sql<number>`COALESCE(SUM(${stocklevels.onHand}) - SUM(${stocklevels.allocated}), 0)`,
    })
    .from(stocklevels)
    .where(eq(stocklevels.productVariantId, variantId));

  return row?.available ?? 0;
}

/**
 * Validate that a variant exists and is active.
 */
async function validateVariant(variantId: number) {
  const [variant] = await db
    .select({
      id: productvariants.id,
      status: productvariants.status,
      productId: productvariants.productId,
    })
    .from(productvariants)
    .where(eq(productvariants.id, variantId))
    .limit(1);

  if (!variant) {
    throw httpError(404, 'VariantNotFound', 'Product variant not found');
  }

  if (variant.status !== 'active') {
    throw httpError(400, 'VariantInactive', 'Product variant is not available');
  }

  // Also check product is active
  const [product] = await db
    .select({ status: products.status })
    .from(products)
    .where(eq(products.id, variant.productId))
    .limit(1);

  if (!product || product.status !== 'active') {
    throw httpError(400, 'ProductInactive', 'Product is not available');
  }

  return variant;
}

// ── Cart Operations ──────────────────────────────────────────────────────────

/**
 * Add a product variant to the user's cart.
 * If the variant already exists, increment the quantity.
 */
export async function addItem(userId: number, data: AddToCartDto): Promise<CartResponse> {
  await validateVariant(data.productVariantId);

  const available = await getAvailableStock(data.productVariantId);
  if (available <= 0) {
    throw httpError(400, 'OutOfStock', 'This item is out of stock');
  }

  const cartId = await getOrCreateCart(userId);

  // Check if variant already in cart
  const [existing] = await db
    .select({ id: cartitems.id, quantity: cartitems.quantity })
    .from(cartitems)
    .where(and(eq(cartitems.cartId, cartId), eq(cartitems.productVariantId, data.productVariantId)))
    .limit(1);

  if (existing) {
    const newQty = Math.min(existing.quantity + data.quantity, MAX_QTY);
    if (newQty > available) {
      throw httpError(
        400,
        'InsufficientStock',
        `Only ${available} units available (you have ${existing.quantity} in cart)`
      );
    }
    await db.update(cartitems).set({ quantity: newQty }).where(eq(cartitems.id, existing.id));
  } else {
    // Check max items limit
    const [countRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(cartitems)
      .where(eq(cartitems.cartId, cartId));

    if ((countRow?.count ?? 0) >= MAX_UNIQUE_ITEMS) {
      throw httpError(400, 'CartFull', `Cart cannot exceed ${MAX_UNIQUE_ITEMS} unique items`);
    }

    if (data.quantity > available) {
      throw httpError(400, 'InsufficientStock', `Only ${available} units available`);
    }

    await db.insert(cartitems).values({
      cartId,
      productVariantId: data.productVariantId,
      quantity: data.quantity,
    });
  }

  // Update cart timestamp
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));

  return getCart(userId);
}

/**
 * Update the quantity of a specific cart item.
 * If quantity is 0, the item is removed.
 */
export async function updateItemQty(
  userId: number,
  itemId: number,
  quantity: number
): Promise<CartResponse> {
  const [cart] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  if (!cart) {
    throw httpError(404, 'CartNotFound', 'Cart not found');
  }

  const [item] = await db
    .select({ id: cartitems.id, productVariantId: cartitems.productVariantId })
    .from(cartitems)
    .where(and(eq(cartitems.id, itemId), eq(cartitems.cartId, cart.id)))
    .limit(1);

  if (!item) {
    throw httpError(404, 'ItemNotFound', 'Cart item not found');
  }

  if (quantity === 0) {
    await db.delete(cartitems).where(eq(cartitems.id, itemId));
  } else {
    const available = await getAvailableStock(item.productVariantId);
    if (quantity > available) {
      throw httpError(400, 'InsufficientStock', `Only ${available} units available`);
    }

    await db
      .update(cartitems)
      .set({ quantity: Math.min(quantity, MAX_QTY) })
      .where(eq(cartitems.id, itemId));
  }

  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));

  return getCart(userId);
}

/**
 * Remove a specific item from the cart.
 */
export async function removeItem(userId: number, itemId: number): Promise<CartResponse> {
  const [cart] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  if (!cart) {
    throw httpError(404, 'CartNotFound', 'Cart not found');
  }

  const result = await db
    .delete(cartitems)
    .where(and(eq(cartitems.id, itemId), eq(cartitems.cartId, cart.id)));

  if (result[0].affectedRows === 0) {
    throw httpError(404, 'ItemNotFound', 'Cart item not found');
  }

  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));

  return getCart(userId);
}

/**
 * Clear all items from the user's cart.
 */
export async function clearCart(userId: number): Promise<CartResponse> {
  const [cart] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  if (cart) {
    await db.delete(cartitems).where(eq(cartitems.cartId, cart.id));
    await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
  }

  return { id: cart?.id ?? 0, items: [], itemCount: 0, subtotal: 0, warnings: [] };
}

/**
 * Merge guest localStorage cart into the server-side cart.
 * For each guest item: if variant already in cart, keep the higher quantity;
 * if not, add it. Silently skips invalid/unavailable variants.
 */
export async function mergeGuestCart(userId: number, data: MergeCartDto): Promise<CartResponse> {
  if (data.items.length === 0) return getCart(userId);

  const cartId = await getOrCreateCart(userId);

  // Fetch all existing cart items
  const existingItems = await db
    .select({
      productVariantId: cartitems.productVariantId,
      quantity: cartitems.quantity,
    })
    .from(cartitems)
    .where(eq(cartitems.cartId, cartId));

  const existingMap = new Map<number, number>();
  for (const item of existingItems) {
    existingMap.set(item.productVariantId, item.quantity);
  }

  // Validate all variant IDs exist and are active
  const variantIds = data.items.map((i: { productVariantId: number }) => i.productVariantId);
  const validVariants = await db
    .select({ id: productvariants.id })
    .from(productvariants)
    .innerJoin(products, eq(productvariants.productId, products.id))
    .where(
      and(
        inArray(productvariants.id, variantIds),
        eq(productvariants.status, 'active'),
        eq(products.status, 'active')
      )
    );

  const validIds = new Set(validVariants.map((v) => v.id));

  // Batch-fetch available stock for all valid variants in one query
  const stockRows = await db
    .select({
      productVariantId: stocklevels.productVariantId,
      available: sql<number>`COALESCE(SUM(${stocklevels.onHand}) - SUM(${stocklevels.allocated}), 0)`,
    })
    .from(stocklevels)
    .where(inArray(stocklevels.productVariantId, [...validIds]))
    .groupBy(stocklevels.productVariantId);

  const stockMap = new Map<number, number>();
  for (const s of stockRows) {
    stockMap.set(s.productVariantId, Number(s.available));
  }

  for (const guestItem of data.items) {
    if (!validIds.has(guestItem.productVariantId)) continue;

    const available = stockMap.get(guestItem.productVariantId) ?? 0;
    if (available <= 0) continue; // skip out-of-stock items silently

    const currentQty = existingMap.get(guestItem.productVariantId);
    // Cap to both MAX_QTY and actual available stock
    const qty = Math.min(guestItem.quantity, MAX_QTY, available);

    if (currentQty !== undefined) {
      // Keep higher quantity (still capped to available)
      if (qty > currentQty) {
        await db
          .update(cartitems)
          .set({ quantity: qty })
          .where(
            and(
              eq(cartitems.cartId, cartId),
              eq(cartitems.productVariantId, guestItem.productVariantId)
            )
          );
      }
    } else {
      // Enforce max items
      if (existingMap.size >= MAX_UNIQUE_ITEMS) break;

      await db.insert(cartitems).values({
        cartId,
        productVariantId: guestItem.productVariantId,
        quantity: qty,
      });
      existingMap.set(guestItem.productVariantId, qty);
    }
  }

  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));

  return getCart(userId);
}

/**
 * Validate all cart items: check stock, variant status, product status.
 * Returns the cart with warnings for any issues found.
 */
export async function validateCart(userId: number): Promise<CartResponse> {
  const cart = await getCart(userId);

  // Auto-remove items that are no longer available
  const itemsToRemove = cart.items.filter(
    (item) =>
      item.warning?.includes('no longer available') || item.warning?.includes('out of stock')
  );

  for (const item of itemsToRemove) {
    await db.delete(cartitems).where(eq(cartitems.id, item.id));
  }

  // If items were removed, refetch
  if (itemsToRemove.length > 0) {
    const updated = await getCart(userId);
    // Carry forward warnings about removed items
    for (const removed of itemsToRemove) {
      updated.warnings.push(`Removed: ${removed.variantName} — ${removed.warning}`);
    }
    return updated;
  }

  return cart;
}
