import type { Currency, CurrencyResponse } from '@milemoto/types';

export function toCurrencyResponse(row: Currency): CurrencyResponse {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    symbol: row.symbol,
    exchangeRate: Number(row.exchangeRate),
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}
