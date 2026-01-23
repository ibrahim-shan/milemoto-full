import { and, eq, sql } from 'drizzle-orm';
import { stocklocations, stockmovements, purchaseorders } from '@milemoto/types';
import type {
  CreateStockLocationDto,
  UpdateStockLocationDto,
} from '../../routes/admin/helpers/stockLocation.helpers.js';
import { isDuplicateEntryError, isRowIsReferencedError } from '../../utils/dbErrors.js';
import { buildDeleteResponse } from '../../utils/response.js';
import { httpError } from '../../utils/error.js';
import { db } from '../../db/drizzle.js';
import { getStockLocation } from './read.js';
import { formatStockLocation } from './shared.js';

export async function createStockLocation(data: CreateStockLocationDto) {
  try {
    const [existing] = await db
      .select({ id: stocklocations.id })
      .from(stocklocations)
      .where(and(eq(stocklocations.name, data.name), eq(stocklocations.type, data.type)))
      .limit(1);

    if (existing) {
      throw httpError(409, 'Conflict', 'A stock location with this name and type already exists');
    }

    const result = await db.insert(stocklocations).values({
      name: data.name,
      type: data.type,
      description: data.description ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      postalCode: data.postalCode ?? null,
      country: data.country ?? null,
      status: data.status,
    });
    const insertId =
      'insertId' in result
        ? Number((result as unknown as { insertId: number }).insertId)
        : undefined;
    if (insertId) return getStockLocation(insertId);

    const [created] = await db
      .select()
      .from(stocklocations)
      .where(and(eq(stocklocations.name, data.name), eq(stocklocations.type, data.type)))
      .limit(1);
    if (created) return formatStockLocation(created);

    throw httpError(500, 'InsertFailed', 'Failed to create stock location');
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(
        409,
        'DuplicateStockLocation',
        'A stock location with this name already exists'
      );
    }
    throw err;
  }
}

export async function updateStockLocation(id: number, data: UpdateStockLocationDto) {
  try {
    const location = await getStockLocation(id);

    if (data.name || data.type) {
      const newName = data.name || location.name;
      const newType = data.type || location.type;

      const [existing] = await db
        .select({ id: stocklocations.id })
        .from(stocklocations)
        .where(
          and(
            eq(stocklocations.name, newName),
            eq(stocklocations.type, newType),
            sql`${stocklocations.id} != ${id}`
          )
        )
        .limit(1);

      if (existing) {
        throw httpError(409, 'Conflict', 'A stock location with this name and type already exists');
      }
    }

    const updates: Partial<CreateStockLocationDto> = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.type !== undefined) updates.type = data.type;
    if (data.description !== undefined) updates.description = data.description ?? null;
    if (data.address !== undefined) updates.address = data.address ?? null;
    if (data.city !== undefined) updates.city = data.city ?? null;
    if (data.state !== undefined) updates.state = data.state ?? null;
    if (data.postalCode !== undefined) updates.postalCode = data.postalCode ?? null;
    if (data.country !== undefined) updates.country = data.country ?? null;
    if (data.status !== undefined) updates.status = data.status;

    if (Object.keys(updates).length === 0) return location;

    await db.update(stocklocations).set(updates).where(eq(stocklocations.id, id));

    return getStockLocation(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(
        409,
        'DuplicateStockLocation',
        'A stock location with this name already exists'
      );
    }
    throw err;
  }
}

export async function deleteStockLocation(id: number) {
  try {
    const [hasMovements] = await db
      .select({ id: stockmovements.id })
      .from(stockmovements)
      .where(eq(stockmovements.stockLocationId, id))
      .limit(1);

    if (hasMovements) {
      throw httpError(
        409,
        'StockLocationInUse',
        'Stock location has stock movements and cannot be deleted. Deactivate instead.'
      );
    }

    const [hasPOs] = await db
      .select({ id: purchaseorders.id })
      .from(purchaseorders)
      .where(eq(purchaseorders.stockLocationId, id))
      .limit(1);

    if (hasPOs) {
      throw httpError(
        409,
        'StockLocationInUse',
        'Stock location is linked to purchase orders and cannot be deleted. Deactivate instead.'
      );
    }

    const result = await db.delete(stocklocations).where(eq(stocklocations.id, id));
    const affected =
      'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
    if (!affected) {
      const [exists] = await db
        .select({ id: stocklocations.id })
        .from(stocklocations)
        .where(eq(stocklocations.id, id))
        .limit(1);
      if (!exists) {
        return buildDeleteResponse();
      }
      throw httpError(404, 'NotFound', 'Stock location not found');
    }
    return buildDeleteResponse();
  } catch (err) {
    if (isRowIsReferencedError(err)) {
      throw httpError(
        409,
        'StockLocationInUse',
        'Stock location is referenced by other records and cannot be deleted. Deactivate instead.'
      );
    }
    throw err;
  }
}
