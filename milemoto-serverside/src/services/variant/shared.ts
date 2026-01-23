import { variants, variantvalues } from '@milemoto/types';
import type { VariantResponse, VariantValueResponse } from '@milemoto/types';
import { httpError } from '../../utils/error.js';

export function mapVariantValue(v: typeof variantvalues.$inferSelect): VariantValueResponse {
  return {
    id: Number(v.id),
    variantId: Number(v.variantId),
    value: v.value,
    slug: v.slug,
    status: v.status,
    createdAt: v.createdAt instanceof Date ? v.createdAt : new Date(v.createdAt),
    updatedAt: v.updatedAt instanceof Date ? v.updatedAt : new Date(v.updatedAt),
  };
}

export function mapVariant(
  row: typeof variants.$inferSelect,
  values: (typeof variantvalues.$inferSelect)[]
): VariantResponse {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    values: values.map(mapVariantValue),
  };
}

export type VariantValueInput = {
  value?: string | undefined;
  slug?: string | undefined;
  status?: 'active' | 'inactive' | undefined;
  id?: number | undefined;
};

export function assertUniqueValues(payload: VariantValueInput[]) {
  const values = payload
    .map((v) => v.value?.toLowerCase())
    .filter((v): v is string => v !== undefined);
  const slugs = payload
    .map((v) => v.slug?.toLowerCase())
    .filter((v): v is string => v !== undefined);

  if (values.length !== new Set(values).size) {
    throw httpError(400, 'BadRequest', 'Duplicate values are not allowed within the same variant');
  }
  if (slugs.length !== new Set(slugs).size) {
    throw httpError(
      400,
      'BadRequest',
      'Duplicate value slugs are not allowed within the same variant'
    );
  }
}
