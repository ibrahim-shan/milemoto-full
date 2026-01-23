import type { Language, LanguageResponse } from '@milemoto/types';

export function formatLanguageRow(row: Language): LanguageResponse {
  return {
    id: Number(row.id),
    name: row.name,
    code: row.code,
    displayMode: row.displayMode,
    countryCode: row.countryCode ?? null,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}
