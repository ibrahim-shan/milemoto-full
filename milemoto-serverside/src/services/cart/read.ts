import { eq, and, sql, inArray } from 'drizzle-orm';
import {
  carts,
  cartitems,
  productvariants,
  products,
  productimages,
  stocklevels,
} from '@milemoto/types';
import type { CartResponse, CartItemResponse } from '@milemoto/types';
import { db } from '../../db/drizzle.js';

/**
 * Get the full cart for an authenticated user, enriched with live prices,
 * product info, and stock availability.
 */
export async function getCart(userId: number): Promise<CartResponse> {
  // 1. Find or create cart
  const [cart] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  if (!cart) {
    return { id: 0, items: [], itemCount: 0, subtotal: 0, warnings: [] };
  }

  // 2. Fetch cart items joined with variant + product data
  const rows = await db
    .select({
      itemId: cartitems.id,
      productVariantId: cartitems.productVariantId,
      quantity: cartitems.quantity,
      addedAt: cartitems.addedAt,
      // Variant
      sku: productvariants.sku,
      variantName: productvariants.name,
      price: productvariants.price,
      variantStatus: productvariants.status,
      // Product
      productId: products.id,
      productName: products.name,
      productSlug: products.slug,
      productStatus: products.status,
    })
    .from(cartitems)
    .innerJoin(productvariants, eq(cartitems.productVariantId, productvariants.id))
    .innerJoin(products, eq(productvariants.productId, products.id))
    .where(eq(cartitems.cartId, cart.id));

  if (rows.length === 0) {
    return { id: cart.id, items: [], itemCount: 0, subtotal: 0, warnings: [] };
  }

  // 3. Fetch primary images for each product (batch)
  const productIds = [...new Set(rows.map((r) => r.productId))] as number[];
  const imageRows = await db
    .select({
      productId: productimages.productId,
      productVariantId: productimages.productVariantId,
      imagePath: productimages.imagePath,
      isPrimary: productimages.isPrimary,
    })
    .from(productimages)
    .where(and(inArray(productimages.productId, productIds)));

  const productImageMap = new Map<number, string>();
  const variantImageMap = new Map<number, string>();
  for (const img of imageRows) {
    const variantId =
      img.productVariantId !== null && img.productVariantId !== undefined
        ? Number(img.productVariantId)
        : null;
    if (variantId !== null && !variantImageMap.has(variantId)) {
      variantImageMap.set(variantId, img.imagePath);
      continue;
    }

    if (img.isPrimary && !productImageMap.has(img.productId)) {
      productImageMap.set(img.productId, img.imagePath);
      continue;
    }

    if (!productImageMap.has(img.productId)) {
      productImageMap.set(img.productId, img.imagePath);
    }
  }

  // 4. Fetch stock levels (sum across all locations)
  const variantIds = rows.map((r) => r.productVariantId);
  const stockRows = await db
    .select({
      productVariantId: stocklevels.productVariantId,
      totalOnHand: sql<number>`COALESCE(SUM(${stocklevels.onHand}), 0)`,
      totalAllocated: sql<number>`COALESCE(SUM(${stocklevels.allocated}), 0)`,
    })
    .from(stocklevels)
    .where(inArray(stocklevels.productVariantId, variantIds))
    .groupBy(stocklevels.productVariantId);

  const stockMap = new Map<number, number>();
  for (const s of stockRows) {
    stockMap.set(s.productVariantId, s.totalOnHand - s.totalAllocated);
  }

  // 5. Build enriched response
  const warnings: string[] = [];
  const items: CartItemResponse[] = [];

  for (const row of rows) {
    const available = stockMap.get(row.productVariantId) ?? 0;
    let warning: string | undefined;

    if (row.variantStatus !== 'active' || row.productStatus !== 'active') {
      warning = `${row.variantName} is no longer available`;
      warnings.push(warning);
    } else if (available <= 0) {
      warning = `${row.variantName} is out of stock`;
      warnings.push(warning);
    } else if (row.quantity > available) {
      warning = `Only ${available} of ${row.variantName} available`;
      warnings.push(warning);
    }

    items.push({
      id: row.itemId,
      productVariantId: row.productVariantId,
      quantity: row.quantity,
      addedAt: row.addedAt.toISOString(),
      sku: row.sku,
      variantName: row.variantName,
      price: row.price,
      productId: row.productId,
      productName: row.productName,
      productSlug: row.productSlug,
      imageSrc:
        variantImageMap.get(row.productVariantId) ?? productImageMap.get(row.productId) ?? null,
      available,
      ...(warning ? { warning } : {}),
    });
  }

  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  return {
    id: cart.id,
    items,
    itemCount: items.reduce((sum, it) => sum + it.quantity, 0),
    subtotal,
    warnings,
  };
}
