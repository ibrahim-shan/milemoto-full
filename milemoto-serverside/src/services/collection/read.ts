import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { collectionProducts, collections, products, productvariants } from '@milemoto/types';
import type { CollectionListQueryDto, CollectionMatchType, CollectionRule } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { mapCollection } from './shared.js';
import { buildProductContext, evaluateRules } from './rules.js';

export async function listCollections(query: CollectionListQueryDto) {
  const {
    page,
    limit,
    status,
    type,
    search,
    filterMode = 'all',
    sortBy = 'createdAt',
    sortDir = 'asc',
  } = query;
  const offset = (page - 1) * limit;

  const searchFilter = search
    ? or(like(collections.name, `%${search}%`), like(collections.slug, `%${search}%`))
    : undefined;
  const optionalFilters = [status ? eq(collections.status, status) : undefined, type ? eq(collections.type, type) : undefined].filter(Boolean);
  const structuredFilter =
    optionalFilters.length === 0
      ? undefined
      : filterMode === 'any'
        ? or(...optionalFilters)
        : and(...optionalFilters);
  const where = and(searchFilter, structuredFilter);
  const sortColumn =
    sortBy === 'name'
      ? collections.name
      : sortBy === 'type'
        ? collections.type
        : sortBy === 'matchType'
          ? collections.matchType
          : sortBy === 'status'
            ? collections.status
            : collections.createdAt;
  const orderByClause = sortDir === 'desc' ? desc(sortColumn) : asc(sortColumn);

  const [items, countRows] = await Promise.all([
    db
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
      .where(where)
      .orderBy(orderByClause, asc(collections.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(collections)
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: items.map(mapCollection),
    totalCount: total,
    page,
    limit,
  });
}

export async function getCollection(id: number) {
  const [row] = await db
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
    .where(eq(collections.id, id))
    .limit(1);

  if (!row) {
    throw httpError(404, 'NotFound', 'Collection not found');
  }
  return mapCollection(row);
}

export async function listCollectionProducts(collectionId: number) {
  const collection = await getCollection(collectionId);

  const rows = await db
    .select({
      variantId: collectionProducts.productVariantId,
      productName: products.name,
      variantName: productvariants.name,
      sku: productvariants.sku,
      barcode: productvariants.barcode,
    })
    .from(collectionProducts)
    .innerJoin(productvariants, eq(productvariants.id, collectionProducts.productVariantId))
    .innerJoin(products, eq(products.id, productvariants.productId))
    .where(eq(collectionProducts.collectionId, collectionId))
    .orderBy(asc(collectionProducts.id));

  return {
    collection,
    items: rows.map((r) => ({
      variantId: Number(r.variantId),
      productName: r.productName,
      variantName: r.variantName,
      sku: r.sku,
      barcode: r.barcode !== null ? String(r.barcode) : null,
    })),
  };
}

export async function previewCollection(
  id: number,
  options?: {
    rules?: CollectionRule[] | undefined;
    matchType?: CollectionMatchType | undefined;
    limit?: number | undefined;
  }
) {
  const collection = await getCollection(id);
  const rules = options?.rules ?? collection.rules ?? [];
  const matchType = options?.matchType ?? collection.matchType;
  const limit = options?.limit && options.limit > 0 ? options.limit : 50;

  if (collection.type !== 'automatic') {
    throw httpError(400, 'BadRequest', 'Preview is only available for automatic collections');
  }

  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
    })
    .from(products)
    .orderBy(asc(products.createdAt))
    .limit(limit);

  const results: { productId: number; productName: string; matched: boolean }[] = [];

  for (const row of productRows) {
    const productId = Number(row.id);
    const productName = row.name;
    const ctx = await buildProductContext(productId);
    if (!ctx) continue;
    const matched = evaluateRules(rules, matchType, ctx);
    results.push({ productId, productName, matched });
  }

  return {
    sampleCount: results.length,
    matchedCount: results.filter((r) => r.matched).length,
    results,
  };
}
