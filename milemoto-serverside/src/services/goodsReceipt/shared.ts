import { goodsreceiptlines } from '@milemoto/types';
import type { GoodsReceiptResponse } from '@milemoto/types';

type GoodsReceiptLineResponse = NonNullable<GoodsReceiptResponse['lines']>[number];

export function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? '');
}

export function mapGoodsReceiptHeader(row: {
  id: number;
  purchaseOrderId: number;
  grnNumber: string;
  status: 'draft' | 'posted';
  note: string | null;
  postedByUserId: number | null;
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  purchaseOrderNumber: string;
  purchaseOrderSubject: string;
}): GoodsReceiptResponse {
  return {
    id: Number(row.id),
    purchaseOrderId: Number(row.purchaseOrderId),
    grnNumber: row.grnNumber,
    status: row.status,
    note: row.note ?? null,
    postedByUserId: row.postedByUserId ?? null,
    postedAt: row.postedAt ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    purchaseOrderNumber: row.purchaseOrderNumber ?? undefined,
    purchaseOrderSubject: row.purchaseOrderSubject ?? null,
  };
}

export function mapGoodsReceiptLine(
  row: typeof goodsreceiptlines.$inferSelect,
  header: Pick<GoodsReceiptResponse, 'createdAt' | 'updatedAt'>
): GoodsReceiptLineResponse {
  return {
    id: Number(row.id),
    goodsReceiptId: Number(row.goodsReceiptId),
    purchaseOrderLineId: Number(row.purchaseOrderLineId),
    productVariantId: Number(row.productVariantId),
    receivedQty: Number(row.receivedQty),
    rejectedQty: Number(row.rejectedQty),
    batchNumber: row.batchNumber ?? null,
    serialNumber: row.serialNumber ?? null,
    expirationDate: row.expirationDate ?? null,
    createdAt: header.createdAt,
    updatedAt: header.updatedAt,
  };
}
