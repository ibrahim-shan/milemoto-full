import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { collectionProducts, collections, productvariants } from '@milemoto/types';
import type { CreateCollection, UpdateCollection } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildDeleteResponse } from '../../utils/response.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { ensureRulesValidForType, mapCollection } from './shared.js';
import { getCollection } from './read.js';
import { evaluateAndSyncCollection } from './sync.js';

async function getCollectionBySlug(slug: string) {
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
    .where(eq(collections.slug, slug))
    .limit(1);
  return row ? mapCollection(row) : null;
}

export async function createCollection(data: CreateCollection) {
  ensureRulesValidForType(data.type, data.rules);
  const rulesJson = data.rules ? JSON.stringify(data.rules) : null;

  const [existing] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(or(eq(collections.name, data.name), eq(collections.slug, data.slug)))
    .limit(1);
  if (existing) {
    throw httpError(
      409,
      'DuplicateCollection',
      'A collection with this name or slug already exists'
    );
  }

  const result = await db.insert(collections).values({
    name: data.name,
    slug: data.slug,
    status: data.status ?? 'active',
    type: data.type,
    matchType: data.matchType ?? 'all',
    rulesJson,
  });

  const insertId =
    'insertId' in result ? Number((result as unknown as { insertId: number }).insertId) : undefined;

  const created = insertId ? await getCollection(insertId) : await getCollectionBySlug(data.slug);
  if (!created) {
    throw httpError(500, 'InsertFailed', 'Failed to create collection');
  }

  if (created.type === 'automatic') {
    await evaluateAndSyncCollection(created.id);
  }

  return created;
}

export async function updateCollection(id: number, data: UpdateCollection) {
  const current = await getCollection(id);
  const nextRules = data.rules ?? current.rules;
  const type = data.type ?? current.type;
  ensureRulesValidForType(type, nextRules);

  if (data.name || data.slug) {
    const nameToUse = data.name ?? current.name;
    const slugToUse = data.slug ?? current.slug;
    const [exists] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          or(eq(collections.name, nameToUse), eq(collections.slug, slugToUse)),
          sql`${collections.id} != ${id}`
        )
      )
      .limit(1);
    if (exists) {
      throw httpError(
        409,
        'DuplicateCollection',
        'A collection with this name or slug already exists'
      );
    }
  }

  const updates: Partial<typeof collections.$inferInsert> = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.slug !== undefined) updates.slug = data.slug;
  if (data.status !== undefined) updates.status = data.status;
  if (data.type !== undefined) updates.type = data.type;
  if (data.matchType !== undefined) updates.matchType = data.matchType;
  if (data.rules !== undefined) updates.rulesJson = JSON.stringify(data.rules ?? []);

  if (Object.keys(updates).length > 0) {
    try {
      await db.update(collections).set(updates).where(eq(collections.id, id));
    } catch (err) {
      if (isDuplicateEntryError(err)) {
        throw httpError(
          409,
          'DuplicateCollection',
          'A collection with this name or slug already exists'
        );
      }
      throw err;
    }
  }

  const updated = await getCollection(id);

  if (
    updated.type === 'automatic' &&
    (data.rules !== undefined || data.matchType !== undefined || data.type !== undefined)
  ) {
    await evaluateAndSyncCollection(id);
  }

  return updated;
}

export async function deleteCollection(id: number) {
  const result = await db.delete(collections).where(eq(collections.id, id));
  const affected =
    'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
  if (!affected) {
    const [exists] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(eq(collections.id, id))
      .limit(1);
    if (!exists) {
      return buildDeleteResponse();
    }
    throw httpError(404, 'NotFound', 'Collection not found');
  }
  return buildDeleteResponse();
}

export async function addProducts(collectionId: number, variantIds: number[]) {
  const collection = await getCollection(collectionId);
  if (collection.type !== 'manual') {
    throw httpError(400, 'BadRequest', 'Products can only be added to manual collections');
  }

  if (!variantIds || variantIds.length === 0) return { success: true };

  const rows = await db
    .select({ id: productvariants.id })
    .from(productvariants)
    .where(inArray(productvariants.id, variantIds));
  if (rows.length !== variantIds.length) {
    throw httpError(400, 'BadRequest', 'One or more product variants not found');
  }

  const values = variantIds.map((vid) => ({
    collectionId,
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

  return { success: true };
}

export async function removeProduct(collectionId: number, variantId: number) {
  const collection = await getCollection(collectionId);
  if (collection.type !== 'manual') {
    throw httpError(400, 'BadRequest', 'Products can only be removed from manual collections');
  }

  await db
    .delete(collectionProducts)
    .where(
      and(
        eq(collectionProducts.collectionId, collectionId),
        eq(collectionProducts.productVariantId, variantId)
      )
    );
  return { success: true };
}
