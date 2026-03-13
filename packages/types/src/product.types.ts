import { z } from "zod";
import {
  ApiModel,
  PaginationSchema,
  type PaginatedResponse,
} from "./common.types.js";
import {
  type Product,
  type ProductVariant,
  type ProductSpecification,
  type ProductVariantAttribute,
  type ProductImage,
  type ProductSpecificationField,
} from "./db.types.js";
import { TrimmedStringSchema } from "./zod.helpers.js";

// --- Zod Schemas ---

const OptionalNonNegativeNumber = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().min(0).optional()
);

const OptionalNonNegativeInt = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().int().min(0).optional()
);

export const ProductVariantSchema = z.object({
  id: z.number().int().positive().optional(),
  sku: TrimmedStringSchema.min(1, "SKU is required"),
  barcode: z
    .preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string())
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  price: z.coerce.number().min(0.01, "Selling price is required"),
  costPrice: OptionalNonNegativeNumber,
  lowStockThreshold: OptionalNonNegativeInt.default(5),
  idealStockQuantity: OptionalNonNegativeInt,
  name: TrimmedStringSchema.min(1, "Variant name is required"),
  status: z.enum(["active", "inactive"]).default("active"),
  imagePath: z.string().optional(),

  // Attributes (e.g. Color: Red)
  attributes: z
    .array(
      z.object({
        variantValueId: z.number().int().positive(),
      })
    )
    .optional(),
});

export const CreateProduct = z.object({
  name: TrimmedStringSchema.min(1, "Product name is required").max(255),
  shortDescription: TrimmedStringSchema.min(1, "Short description is required").max(255),
  longDescription: TrimmedStringSchema.min(1, "Long description is required"),
  status: z.enum(["active", "inactive"]).default("active"),
  isFeatured: z.boolean().default(false),
  brandId: z.number().int().positive("Brand is required"),
  categoryId: z.number().int().positive("Category is required"),
  subCategoryId: z.number().int().positive("Sub-category is required"),
  vendorId: z.number().int().positive().optional(),
  shippingMethodId: z.number().int().positive().optional(),
  warrantyId: z.number().int().positive().optional(),

  // New Fields
  gradeId: z.number().int().positive("Grade is required"),

  // Dynamic Specifications
  specifications: z
    .array(
      z.object({
        unitGroupId: z.number().int().positive(),
        unitValueId: z.number().int().positive(),
        fields: z
          .array(
            z.object({
              unitFieldId: z.number().int().positive(),
              value: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),

  // Variants - REQUIRED: At least one variant (even if default)
  variants: z
    .array(ProductVariantSchema)
    .min(1, "At least one variant is required"),

  // Base images
  images: z.array(z.string()).min(1, "At least one image is required"),
});

export const UpdateProduct = CreateProduct.partial().extend({
  status: z.enum(["active", "inactive"]).optional(),
  isFeatured: z.boolean().optional(),
});

export type CreateProductDto = z.infer<typeof CreateProduct>;
export type UpdateProductDto = z.infer<typeof UpdateProduct>;
export type ProductVariantDto = z.infer<typeof ProductVariantSchema>;

export const ProductListQuery = PaginationSchema.extend({
  filterMode: z.enum(["all", "any"]).optional(),
  status: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.enum(["active", "inactive"]).optional(),
  ),
  isFeatured: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z
      .union([z.boolean(), z.enum(["true", "false"])])
      .transform((val) => (typeof val === "boolean" ? val : val === "true"))
      .optional(),
  ),
  categoryId: z
    .union([z.coerce.number().int().positive(), z.array(z.coerce.number().int().positive())])
    .optional(),
  subCategoryId: z
    .union([z.coerce.number().int().positive(), z.array(z.coerce.number().int().positive())])
    .optional(),
  brandId: z
    .union([z.coerce.number().int().positive(), z.array(z.coerce.number().int().positive())])
    .optional(),
  vendorId: z
    .union([z.coerce.number().int().positive(), z.array(z.coerce.number().int().positive())])
    .optional(),
  gradeId: z
    .union([z.coerce.number().int().positive(), z.array(z.coerce.number().int().positive())])
    .optional(),
  warrantyId: z
    .union([z.coerce.number().int().positive(), z.array(z.coerce.number().int().positive())])
    .optional(),
  specValueId: z
    .union([z.coerce.number().int().positive(), z.array(z.coerce.number().int().positive())])
    .optional(),
  sku: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().min(1).max(255).optional(),
  ),
  priceMin: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().min(0).optional(),
  ),
  priceMax: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().min(0).optional(),
  ),
  sortBy: z
    .enum([
      "id",
      "name",
      "brand",
      "category",
      "subCategory",
      "grade",
      "warranty",
      "featured",
      "status",
      "createdAt",
      "updatedAt",
    ])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export type ProductListQueryDto = z.infer<typeof ProductListQuery>;

// --- Interfaces ---

export interface ProductSpecificationFieldResponse
  extends ApiModel<ProductSpecificationField> {
  fieldName?: string;
}

export interface ProductSpecificationResponse
  extends ApiModel<ProductSpecification> {
  fields?: ProductSpecificationFieldResponse[];
  groupName?: string;
  valueName?: string;
  valueCode?: string;
}

export interface ProductVariantAttributeResponse
  extends ApiModel<ProductVariantAttribute> { }

export interface ProductVariantResponse extends ApiModel<ProductVariant> {
  price: number;
  costPrice: number | null;
  attributes?: ProductVariantAttributeResponse[];
  images?: ProductImageResponse[];
  imagePath?: string;
}

export interface ProductResponse extends ApiModel<Product> {
  createdAt: string;
  updatedAt: string;
  specifications?: ProductSpecificationResponse[];
  variants?: ProductVariantResponse[];
  images?: string[];
  imagePath?: string | null;
  brandName?: string;
  categoryName?: string;
  subCategoryName?: string;
  vendorName?: string;
  shippingMethodName?: string;
  gradeName?: string;
  warrantyName?: string;
}

export interface ProductImageResponse extends ApiModel<ProductImage> { }

export interface PaginatedProductResponse
  extends PaginatedResponse<ProductResponse> {
  totalVariants?: number;
}
