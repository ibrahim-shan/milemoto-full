import { products } from '@milemoto/types';

// Helper to generate slug
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function generateVariantSku(
  brandCode: string,
  attributeValues: string[],
  existingSku?: string
) {
  const attrPart =
    attributeValues.length > 0
      ? attributeValues.map((val) => val.substring(0, 2).toUpperCase() || 'XX').join('-')
      : 'DEF';
  let randomPart = existingSku?.split('-').pop();
  if (!randomPart || randomPart.length < 4) {
    randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  return `${brandCode}-${attrPart}-${randomPart}`;
}

export function pickInsertId(result: unknown): number | null {
  if (result && typeof result === 'object' && 'insertId' in result) {
    const insertId = Number((result as { insertId: number }).insertId);
    return Number.isFinite(insertId) ? insertId : null;
  }
  return null;
}

export const productSelect = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  brandId: products.brandId,
  categoryId: products.categoryId,
  subCategoryId: products.subCategoryId,
  vendorId: products.vendorId,
  warrantyId: products.warrantyId,
  shippingMethodId: products.shippingMethodId,
  gradeId: products.gradeId,
  shortDescription: products.shortDescription,
  longDescription: products.longDescription,
  status: products.status,
  isFeatured: products.isFeatured,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
};

export type ProductVariantListItem = {
  id: number;
  sku: string;
  barcode: string | null;
  price: number;
  variantName: string;
  productName: string;
  imagePath: string | null;
};
