import { asc, eq } from 'drizzle-orm';
import { shippingmethods } from '@milemoto/types';
import type { UpdateShippingMethodDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { formatShippingMethod } from './shared.js';

async function fetchShippingMethodByCode(code: string) {
  const [row] = await db
    .select()
    .from(shippingmethods)
    .where(eq(shippingmethods.code, code))
    .limit(1);
  if (!row) {
    throw httpError(404, 'NotFound', 'Shipping method not found');
  }
  return formatShippingMethod(row);
}

export async function listShippingMethods() {
  const items = await db.select().from(shippingmethods).orderBy(asc(shippingmethods.id));
  return items.map(formatShippingMethod);
}

export async function updateShippingMethod(code: string, data: UpdateShippingMethodDto) {
  await fetchShippingMethodByCode(code);

  const updates: Partial<typeof shippingmethods.$inferInsert> = {};

  if (data.status) {
    updates.status = data.status;
  }

  if (data.cost !== undefined && (code === 'flatRate' || code === 'areaWise')) {
    updates.cost = data.cost;
  }

  if (Object.keys(updates).length === 0) {
    return fetchShippingMethodByCode(code);
  }

  await db.update(shippingmethods).set(updates).where(eq(shippingmethods.code, code));

  return fetchShippingMethodByCode(code);
}
