import { z } from "zod";
import {
  ApiModel,
  PaginationSchema,
  type PaginatedResponse,
} from "./common.types.js";
import { type StockLevel, type StockMovement } from "./db.types.js";
import { TrimmedStringSchema } from "./zod.helpers.js";

const QueryBoolean = z.preprocess(
  (value) => (typeof value === "boolean" ? String(value) : value),
  z
    .enum(["true", "false"])
    .transform((value) => value === "true")
);

export const StockLevelSortBy = z.enum([
  "sku",
  "productName",
  "stockLocationName",
  "costPrice",
  "price",
  "onHand",
  "allocated",
  "onOrder",
  "updatedAt",
]);

export const SortDir = z.enum(["asc", "desc"]);

export const StockLevelListQuery = PaginationSchema.extend({
  productVariantId: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  brandId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  subCategoryId: z.coerce.number().int().positive().optional(),
  stockLocationId: z.coerce.number().int().positive().optional(),
  lowStockOnly: QueryBoolean.optional(),
  outOfStockOnly: QueryBoolean.optional(),
  allocatedOnly: QueryBoolean.optional(),
  onOrderOnly: QueryBoolean.optional(),
  filterMode: z.enum(["all", "any"]).optional(),
  sortBy: StockLevelSortBy.optional(),
  sortDir: SortDir.optional(),
});

export type StockLevelListQueryDto = z.infer<typeof StockLevelListQuery>;

export interface StockLevelResponse extends ApiModel<StockLevel> {
  sku?: string;
  variantName?: string;
  productName?: string;
  stockLocationName?: string;
  lowStockThreshold?: number | null;
  costPrice?: number | null;
  price?: number | null;
}

export type PaginatedStockLevelResponse = PaginatedResponse<StockLevelResponse>;

export const StockMovementType = z.enum([
  "purchase_receipt",
  "purchase_return",
  "sale_shipment",
  "adjustment",
  "transfer_in",
  "transfer_out",
]);

export const StockMovementListQuery = PaginationSchema.extend({
  productVariantId: z.coerce.number().int().positive().optional(),
  stockLocationId: z.coerce.number().int().positive().optional(),
  type: StockMovementType.optional(),
  sortBy: z
    .enum(["createdAt", "sku", "productName", "stockLocationName", "quantity", "type", "referenceType"])
    .optional(),
  sortDir: SortDir.optional(),
});

export type StockMovementListQueryDto = z.infer<typeof StockMovementListQuery>;

export interface StockMovementResponse extends ApiModel<StockMovement> {
  sku?: string;
  variantName?: string;
  productName?: string;
  stockLocationName?: string;
  referenceDisplay?: string;
}

export type PaginatedStockMovementResponse =
  PaginatedResponse<StockMovementResponse>;

export interface StockSummaryResponse {
  locationCount: number;
  productsQuantity: number;
  totalStockValue: number;
  expectedRevenue: number;
}

export interface StockFilterOptionsResponse {
  brands: Array<{ id: number; name: string }>;
  categories: Array<{ id: number; name: string }>;
  subcategories: Array<{ id: number; name: string; parentId: number | null }>;
  locations: Array<{ id: number; name: string }>;
}

// ==== Stock Adjustment Input ====

export const StockAdjustmentInput = z.object({
  productVariantId: z.number().int().positive(),
  stockLocationId: z.number().int().positive(),
  // Can be positive (increase) or negative (decrease), but not zero
  quantity: z.number().refine((val) => val !== 0, {
    message: "Quantity must be non-zero",
  }),
  note: TrimmedStringSchema.max(500).optional(),
});

export type CreateStockAdjustmentDto = z.infer<typeof StockAdjustmentInput>;

// ==== Stock Transfer Input ====

export const StockTransferInput = z.object({
  productVariantId: z.number().int().positive(),
  fromLocationId: z.number().int().positive(),
  toLocationId: z
    .number()
    .int()
    .positive()
    .refine((val) => true, { message: "To location must be specified" }),
  quantity: z.number().positive("Quantity must be greater than zero"),
  note: TrimmedStringSchema.max(500).optional(),
});

export type CreateStockTransferDto = z.infer<typeof StockTransferInput>;
