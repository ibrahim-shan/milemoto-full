import { shippingarearates, shippingmethods } from '@milemoto/types';

export function formatShippingMethod(row: typeof shippingmethods.$inferSelect) {
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    status: row.status,
    cost: row.cost !== null ? Number(row.cost) : null,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export function formatAreaRate(
  row: typeof shippingarearates.$inferSelect & {
    countryName: string;
    stateName: string | null;
    cityName: string | null;
  }
) {
  return {
    id: Number(row.id),
    cost: Number(row.cost),
    countryId: Number(row.countryId),
    stateId: row.stateId !== null ? Number(row.stateId) : null,
    cityId: row.cityId !== null ? Number(row.cityId) : null,
    countryName: row.countryName,
    stateName: row.stateName ?? null,
    cityName: row.cityName ?? null,
  };
}
