import type { CollectionRule, CollectionResponse } from '@milemoto/types';
import { collections } from '@milemoto/types';
import { httpError } from '../../utils/error.js';

export const STRING_OPERATORS = new Set(['equals', 'not_equals', 'contains']);
export const NUMERIC_OPERATORS = new Set(['equals', 'not_equals', 'lt', 'gt']);

export function mapCollection(
  row: typeof collections.$inferSelect & { rulesJson?: string | null }
): CollectionResponse {
  const rulesJson = row.rulesJson ?? null;
  let rules: CollectionRule[] | undefined;
  if (rulesJson) {
    try {
      rules = JSON.parse(rulesJson) as CollectionRule[];
    } catch {
      rules = undefined;
    }
  }

  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    status: row.status,
    type: row.type,
    matchType: row.matchType,
    rulesJson,
    ...(rules ? { rules } : {}),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export function ensureRulesValidForType(
  type: 'manual' | 'automatic',
  rules: CollectionRule[] | undefined
) {
  if (type === 'manual' && rules && rules.length > 0) {
    throw httpError(400, 'BadRequest', 'Manual collections cannot have rules');
  }
  if (type === 'automatic' && (!rules || rules.length === 0)) {
    throw httpError(400, 'BadRequest', 'Automatic collections require at least one rule');
  }
}

export function coerceNumber(val: unknown): number | null {
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}
