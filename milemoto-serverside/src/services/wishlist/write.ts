import { and, eq, inArray } from 'drizzle-orm';
import { products, wishlistitems } from '@milemoto/types';
import type { AddWishlistItemDto, MergeWishlistDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { getWishlist } from './read.js';

async function resolveProductBySlug(productSlug: string) {
  const [product] = await db
    .select({ id: products.id, slug: products.slug, status: products.status })
    .from(products)
    .where(eq(products.slug, productSlug))
    .limit(1);

  if (!product) throw httpError(404, 'NotFound', 'Product not found');
  if (product.status !== 'active') {
    throw httpError(400, 'ProductUnavailable', 'Product is not available');
  }
  return product;
}

export async function addWishlistItem(userId: number, input: AddWishlistItemDto) {
  const product = await resolveProductBySlug(input.productSlug);

  const [existing] = await db
    .select({ id: wishlistitems.id })
    .from(wishlistitems)
    .where(and(eq(wishlistitems.userId, userId), eq(wishlistitems.productId, Number(product.id))))
    .limit(1);

  if (!existing) {
    await db.insert(wishlistitems).values({
      userId,
      productId: Number(product.id),
    });
  }

  return getWishlist(userId);
}

export async function removeWishlistItemBySlug(userId: number, productSlug: string) {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, productSlug))
    .limit(1);

  if (product) {
    await db
      .delete(wishlistitems)
      .where(and(eq(wishlistitems.userId, userId), eq(wishlistitems.productId, Number(product.id))));
  }

  return getWishlist(userId);
}

export async function clearWishlist(userId: number) {
  await db.delete(wishlistitems).where(eq(wishlistitems.userId, userId));
  return getWishlist(userId);
}

export async function mergeWishlist(userId: number, input: MergeWishlistDto) {
  const slugs = [...new Set(input.items.map(i => i.productSlug.trim()).filter(Boolean))];
  if (slugs.length === 0) return getWishlist(userId);

  const productRows = await db
    .select({ id: products.id, slug: products.slug, status: products.status })
    .from(products)
    .where(inArray(products.slug, slugs));

  const eligibleProductIds = productRows
    .filter(p => p.status === 'active')
    .map(p => Number(p.id));

  if (eligibleProductIds.length === 0) return getWishlist(userId);

  const existingRows = await db
    .select({ productId: wishlistitems.productId })
    .from(wishlistitems)
    .where(and(eq(wishlistitems.userId, userId), inArray(wishlistitems.productId, eligibleProductIds)));

  const existingSet = new Set(existingRows.map(r => Number(r.productId)));
  const toInsert = eligibleProductIds.filter(id => !existingSet.has(id));

  if (toInsert.length > 0) {
    await db.insert(wishlistitems).values(toInsert.map(productId => ({ userId, productId })));
  }

  return getWishlist(userId);
}

