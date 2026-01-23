import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  collectionProducts,
  collections,
  productvariantattributes,
  productvariants,
  products,
} from '@milemoto/types';
import type { CollectionResponse } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { logger } from '../../utils/logger.js';
import { mapCollection } from './shared.js';
import { buildProductContext, evaluateRules } from './rules.js';
import { getCollection } from './read.js';

export async function evaluateAndSyncCollection(collectionId: number) {
  const collection = await getCollection(collectionId);
  if (collection.type !== 'automatic' || !collection.rules || collection.rules.length === 0) {
    return;
  }

  const productRows = await db.select({ id: products.id }).from(products);

  for (const row of productRows) {
    const productId = Number(row.id);
    await evaluateAndSyncForProduct(collection, productId);
  }
}

export async function evaluateAndSyncForProduct(collection: CollectionResponse, productId: number) {
  const ctx = await buildProductContext(productId);
  if (!ctx) return;

  const matched = evaluateRules(collection.rules ?? [], collection.matchType, ctx);

  const variantRows = await db
    .select({ id: productvariants.id })
    .from(productvariants)
    .where(and(eq(productvariants.productId, productId), eq(productvariants.status, 'active')));
  const variantIds = variantRows.map((row) => Number(row.id));

  if (matched) {
    if (variantIds.length === 0) return;
    const values = variantIds.map((vid) => ({
      collectionId: collection.id,
      productVariantId: vid,
    }));

    await db
      .insert(collectionProducts)
      .values(values)
      .onDuplicateKeyUpdate({
        set: {
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      });
  } else {
    if (variantIds.length === 0) return;
    await db
      .delete(collectionProducts)
      .where(
        and(
          eq(collectionProducts.collectionId, collection.id),
          inArray(collectionProducts.productVariantId, variantIds)
        )
      );
  }
}

export async function syncAutomaticCollectionsForProduct(productId: number) {
  enqueueProductSync(productId);
}

export async function syncAutomaticCollectionsForVariantValue(variantValueId: number) {
  const rows = await db
    .select({ productId: products.id })
    .from(productvariantattributes)
    .innerJoin(productvariants, eq(productvariantattributes.productVariantId, productvariants.id))
    .innerJoin(products, eq(productvariants.productId, products.id))
    .where(eq(productvariantattributes.variantValueId, variantValueId))
    .groupBy(products.id);

  if (rows.length === 0) return;
  const productIds = rows.map((r) => Number(r.productId));
  for (const id of productIds) {
    enqueueProductSync(id);
  }
}

const productSyncQueue = new Set<number>();
let productSyncTimer: NodeJS.Timeout | null = null;
const PRODUCT_SYNC_DELAY_MS = 150;

function enqueueProductSync(productId: number) {
  productSyncQueue.add(productId);
  if (productSyncTimer) return;
  productSyncTimer = setTimeout(flushProductSyncQueue, PRODUCT_SYNC_DELAY_MS);
}

async function flushProductSyncQueue() {
  const ids = Array.from(productSyncQueue);
  productSyncQueue.clear();
  productSyncTimer = null;
  if (ids.length === 0) return;

  try {
    const started = Date.now();
    const collectionsRows = await db
      .select({
        id: collections.id,
        name: collections.name,
        slug: collections.slug,
        status: collections.status,
        type: collections.type,
        matchType: collections.matchType,
        rulesJson: collections.rulesJson,
        createdAt: collections.createdAt,
        updatedAt: collections.updatedAt,
      })
      .from(collections)
      .where(eq(collections.type, 'automatic'));

    const automaticCollections = collectionsRows
      .map(mapCollection)
      .filter((c) => c.rules && c.rules.length > 0);

    if (automaticCollections.length === 0) return;

    for (const collection of automaticCollections) {
      for (const productId of ids) {
        await evaluateAndSyncForProduct(collection, productId);
      }
    }

    logger.info(
      {
        code: 'CollectionAutoSync',
        products: ids.length,
        collections: automaticCollections.length,
        ms: Date.now() - started,
      },
      'Auto-synced collections for products'
    );
  } catch (err) {
    logger.error({ code: 'CollectionAutoSyncError', err }, 'Failed to auto-sync collections');
  }
}
