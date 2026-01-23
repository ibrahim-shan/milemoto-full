import { z } from "zod";
import {
  ApiModel,
  PaginationSchema,
  type PaginatedResponse,
} from "./common.types.js";
import { type GoodsReceipt, type GoodsReceiptLine } from "./db.types.js";
import { OptionalDateOnlyStringSchema, TrimmedStringSchema } from "./zod.helpers.js";

export const GoodsReceiptStatus = z.enum(["draft", "posted"]);

export const GoodsReceiptLineInput = z.object({
  purchaseOrderLineId: z.number().int().positive(),
  receivedQty: z.number().int().min(0, "Received quantity cannot be negative"),
  rejectedQty: z
    .number()
    .int()
    .min(0, "Rejected quantity cannot be negative")
    .optional(),
  batchNumber: TrimmedStringSchema.max(100).optional(),
  serialNumber: TrimmedStringSchema.max(100).optional(),
  expirationDate: OptionalDateOnlyStringSchema,
});

export const CreateGoodsReceipt = z.object({
  purchaseOrderId: z.number().int().positive(),
  note: TrimmedStringSchema.optional(),
  lines: z.array(GoodsReceiptLineInput).min(1, "At least one line is required"),
});

export const GoodsReceiptListQuery = PaginationSchema.extend({
  purchaseOrderId: z.coerce.number().int().positive().optional(),
});

export type CreateGoodsReceiptDto = z.infer<typeof CreateGoodsReceipt>;
export type GoodsReceiptListQueryDto = z.infer<typeof GoodsReceiptListQuery>;
export type UpdateGoodsReceiptDto = CreateGoodsReceiptDto;

export interface GoodsReceiptResponse extends ApiModel<GoodsReceipt> {
  purchaseOrderNumber?: string;
  purchaseOrderSubject?: string;
  lines?: ApiModel<GoodsReceiptLine>[];
}

export type PaginatedGoodsReceiptResponse =
  PaginatedResponse<GoodsReceiptResponse>;
