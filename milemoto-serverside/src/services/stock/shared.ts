import type { StockLevelResponse, StockMovementResponse } from '@milemoto/types';

export type UnknownRow = Record<string, unknown>;

export function firstRow<T extends UnknownRow>(result: unknown): T | undefined {
  if (!result) return undefined;
  if (Array.isArray(result)) {
    if (result.length === 0) return undefined;
    const first = result[0];
    if (Array.isArray(first)) return first[0] as T | undefined;
    return first as T | undefined;
  }
  if (typeof result === 'object' && 'rows' in (result as object)) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows[0] as T | undefined;
  }
  return undefined;
}

export function mapStockLevelRow(row: UnknownRow): StockLevelResponse {
  const base: StockLevelResponse = {
    id: Number(row.id),
    productVariantId: Number(row.productVariantId),
    stockLocationId: Number(row.stockLocationId),
    onHand: Number(row.onHand),
    allocated: Number(row.allocated),
    onOrder: Number(row.onOrder),
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? ''),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt ?? ''),
  };

  const sku = row.sku === null || typeof row.sku === 'string' ? row.sku : undefined;
  if (typeof sku === 'string') base.sku = sku;

  const variantName =
    row.variantName === null || typeof row.variantName === 'string' ? row.variantName : undefined;
  if (typeof variantName === 'string') base.variantName = variantName;

  const productName =
    row.productName === null || typeof row.productName === 'string' ? row.productName : undefined;
  if (typeof productName === 'string') base.productName = productName;

  const stockLocationName =
    row.stockLocationName === null || typeof row.stockLocationName === 'string'
      ? row.stockLocationName
      : undefined;
  if (typeof stockLocationName === 'string') base.stockLocationName = stockLocationName;

  if (row.lowStockThreshold === null) {
    base.lowStockThreshold = null;
  } else if (row.lowStockThreshold !== undefined) {
    base.lowStockThreshold = Number(row.lowStockThreshold);
  }

  // Price (selling price)
  if (row.price !== undefined) {
    base.price = row.price === null ? null : Number(row.price);
  }

  // Cost price (buying price)
  if (row.costPrice !== undefined) {
    base.costPrice = row.costPrice === null ? null : Number(row.costPrice);
  }

  return base;
}

export function mapStockMovementRow(row: UnknownRow): StockMovementResponse {
  const updatedAtValue = row.updatedAt ?? row.createdAt;
  const base: StockMovementResponse = {
    id: Number(row.id),
    productVariantId: Number(row.productVariantId),
    stockLocationId: Number(row.stockLocationId),
    performedByUserId:
      row.performedByUserId !== undefined && row.performedByUserId !== null
        ? Number(row.performedByUserId)
        : null,
    quantity: Number(row.quantity),
    type: row.type as StockMovementResponse['type'],
    referenceType:
      row.referenceType === null || typeof row.referenceType === 'string'
        ? row.referenceType
        : null,
    referenceId:
      row.referenceId !== null && row.referenceId !== undefined ? Number(row.referenceId) : null,
    note: row.note === null || typeof row.note === 'string' ? row.note : null,
    transferId:
      row.transferId === null || typeof row.transferId === 'string' ? row.transferId : null,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? ''),
    updatedAt:
      updatedAtValue instanceof Date ? updatedAtValue.toISOString() : String(updatedAtValue ?? ''),
  };

  const sku = row.sku === null || typeof row.sku === 'string' ? row.sku : undefined;
  if (typeof sku === 'string') base.sku = sku;

  const variantName =
    row.variantName === null || typeof row.variantName === 'string' ? row.variantName : undefined;
  if (typeof variantName === 'string') base.variantName = variantName;

  const productName =
    row.productName === null || typeof row.productName === 'string' ? row.productName : undefined;
  if (typeof productName === 'string') base.productName = productName;

  const stockLocationName =
    row.stockLocationName === null || typeof row.stockLocationName === 'string'
      ? row.stockLocationName
      : undefined;
  if (typeof stockLocationName === 'string') base.stockLocationName = stockLocationName;

  return base;
}
