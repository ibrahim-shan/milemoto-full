import { and, asc, eq, inArray } from 'drizzle-orm';
import { productimages, products, productvariants, wishlistitems } from '@milemoto/types';
import type { WishlistItemResponse, WishlistResponse } from '@milemoto/types';
import { db } from '../../db/drizzle.js';

export async function getWishlist(userId: number): Promise<WishlistResponse> {
  const rows = await db
    .select({
      id: wishlistitems.id,
      productId: wishlistitems.productId,
      addedAt: wishlistitems.addedAt,
      productName: products.name,
      productSlug: products.slug,
      productStatus: products.status,
    })
    .from(wishlistitems)
    .innerJoin(products, eq(products.id, wishlistitems.productId))
    .where(eq(wishlistitems.userId, userId))
    .orderBy(asc(wishlistitems.addedAt));

  if (rows.length === 0) return { items: [], itemCount: 0 };

  const productIds = rows.map((r) => Number(r.productId));

  const [imageRows, variantPriceRows] = await Promise.all([
    db
      .select({
        productId: productimages.productId,
        productVariantId: productimages.productVariantId,
        imagePath: productimages.imagePath,
        isPrimary: productimages.isPrimary,
      })
      .from(productimages)
      .where(inArray(productimages.productId, productIds)),
    db
      .select({
        productId: productvariants.productId,
        price: productvariants.price,
      })
      .from(productvariants)
      .where(
        and(inArray(productvariants.productId, productIds), eq(productvariants.status, 'active'))
      )
      .orderBy(asc(productvariants.productId), asc(productvariants.id)),
  ]);

  const imageMap = new Map<number, string>();
  const productLevelFallbackMap = new Map<number, string>();
  const variantLevelFallbackMap = new Map<number, string>();
  for (const img of imageRows) {
    const pid = Number(img.productId);
    const isVariantLevel = img.productVariantId !== null && img.productVariantId !== undefined;

    if (!isVariantLevel && img.isPrimary) {
      imageMap.set(pid, img.imagePath);
      continue;
    }

    if (!isVariantLevel && !productLevelFallbackMap.has(pid)) {
      productLevelFallbackMap.set(pid, img.imagePath);
      continue;
    }

    if (isVariantLevel && !variantLevelFallbackMap.has(pid)) {
      variantLevelFallbackMap.set(pid, img.imagePath);
    }
  }

  for (const pid of productIds) {
    if (imageMap.has(pid)) continue;
    const productFallback = productLevelFallbackMap.get(pid);
    if (productFallback) {
      imageMap.set(pid, productFallback);
      continue;
    }
    const variantFallback = variantLevelFallbackMap.get(pid);
    if (variantFallback) {
      imageMap.set(pid, variantFallback);
    }
  }

  const priceMap = new Map<number, number>();
  const hasActiveVariantSet = new Set<number>();
  for (const row of variantPriceRows) {
    const pid = Number(row.productId);
    hasActiveVariantSet.add(pid);
    if (!priceMap.has(pid)) priceMap.set(pid, Number(row.price));
  }

  const items: WishlistItemResponse[] = rows
    .map((row) => {
      const productId = Number(row.productId);
      const isActive = row.productStatus === 'active';
      const hasActiveVariant = hasActiveVariantSet.has(productId);
      const unavailableReason: 'inactive' | 'unavailable' | null = !isActive
        ? 'inactive'
        : !hasActiveVariant
          ? 'unavailable'
          : null;

      return {
        id: Number(row.id),
        productId,
        productSlug: row.productSlug,
        productName: row.productName,
        imageSrc: imageMap.get(productId) ?? null,
        price: priceMap.get(productId) ?? 0,
        isActive,
        hasActiveVariant,
        unavailableReason,
        addedAt: row.addedAt.toISOString(),
      };
    })
    .reverse(); // newest first

  return { items, itemCount: items.length };
}
