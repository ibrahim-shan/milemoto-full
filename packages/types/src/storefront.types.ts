import { z } from "zod";
import { PaginationSchema, type PaginatedResponse } from "./common.types.js";

// ── Storefront list-products query ──────────────────────────────────────────
export const StorefrontListQuery = PaginationSchema.extend({
  search: z.string().optional(),
  sort: z.enum(["newest", "price-asc", "price-desc", "name-asc"]).optional(),
  categoryId: z
    .union([
      z.coerce.number().int().positive(),
      z.array(z.coerce.number().int().positive()),
    ])
    .optional(),
  subCategoryId: z
    .union([
      z.coerce.number().int().positive(),
      z.array(z.coerce.number().int().positive()),
    ])
    .optional(),
  brandId: z
    .union([
      z.coerce.number().int().positive(),
      z.array(z.coerce.number().int().positive()),
    ])
    .optional(),
  gradeId: z
    .union([
      z.coerce.number().int().positive(),
      z.array(z.coerce.number().int().positive()),
    ])
    .optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});
export type StorefrontListQueryDto = z.infer<typeof StorefrontListQuery>;

// ── Storefront product list item (slim) ─────────────────────────────────────
export interface StorefrontProductListItem {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  imageSrc: string | null;
  startingPrice: number | null;
  brandName: string | null;
  categoryName: string | null;
}

export type PaginatedStorefrontProducts =
  PaginatedResponse<StorefrontProductListItem>;

// ── Storefront product variant (public fields only) ─────────────────────────
export interface StorefrontVariant {
  id: number;
  name: string;
  sku: string;
  price: number;
  imagePath: string | null;
  available: number; // onHand - allocated
  attributes: { variantValueId: number; valueName: string }[];
}

// ── Storefront specification field ──────────────────────────────────────────
export interface StorefrontSpecField {
  fieldName: string;
  value: string | null;
}

export interface StorefrontSpec {
  groupName: string;
  valueName: string;
  fields: StorefrontSpecField[];
}

// ── Storefront product detail (full, by slug) ───────────────────────────────
export interface StorefrontProductDetail {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  longDescription: string | null;
  images: string[];
  brandName: string | null;
  categoryName: string | null;
  subCategoryName: string | null;
  gradeName: string | null;
  warrantyName: string | null;
  variants: StorefrontVariant[];
  specifications: StorefrontSpec[];
}

// ── Storefront filter sidebar data ──────────────────────────────────────────
export interface StorefrontFilterItem {
  id: number;
  name: string;
  count: number;
}

export interface StorefrontCategoryFilter {
  id: number;
  name: string;
  count: number;
  subCategories: StorefrontFilterItem[];
}

export interface StorefrontFiltersResponse {
  categories: StorefrontCategoryFilter[];
  brands: StorefrontFilterItem[];
  grades: StorefrontFilterItem[];
  /** The highest variant price across all active products (in dollars). */
  maxPrice: number;
}
