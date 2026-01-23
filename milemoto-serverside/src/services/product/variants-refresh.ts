import { eq, inArray } from 'drizzle-orm';
import {
  brands,
  productvariantattributes,
  productvariants,
  products,
  variantvalues,
} from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { generateVariantSku } from './shared.js';

type VariantSkuContext = {
  productVariantId: number;
  variantName: string | null;
  sku: string | null;
  brandId: number | null;
};

async function rebuildVariantSkuData(rows: VariantSkuContext[]) {
  if (rows.length === 0) return;

  const variantIds = rows.map((r) => r.productVariantId);

  const valueRows = await db
    .select({
      productVariantId: productvariantattributes.productVariantId,
      value: variantvalues.value,
    })
    .from(productvariantattributes)
    .innerJoin(variantvalues, eq(productvariantattributes.variantValueId, variantvalues.id))
    .where(inArray(productvariantattributes.productVariantId, variantIds));

  const valuesMap = new Map<number, string[]>();
  for (const row of valueRows) {
    const arr = valuesMap.get(row.productVariantId) ?? [];
    arr.push(row.value);
    valuesMap.set(row.productVariantId, arr);
  }

  const brandIds = [...new Set(rows.map((r) => r.brandId).filter((b): b is number => b !== null))];
  const brandMap = new Map<number, string>();
  if (brandIds.length) {
    const brandRows = await db
      .select({ id: brands.id, name: brands.name })
      .from(brands)
      .where(inArray(brands.id, brandIds));
    for (const br of brandRows) brandMap.set(br.id, br.name);
  }

  await Promise.all(
    rows.map((row) => {
      const values = valuesMap.get(row.productVariantId) ?? [];
      const newName = values.length > 0 ? values.join(' / ') : (row.variantName ?? '');
      const brandName = row.brandId ? brandMap.get(row.brandId) : undefined;
      const brandCode = brandName ? brandName.substring(0, 3).toUpperCase() : 'GEN';
      const newSku = generateVariantSku(brandCode, values, row.sku ?? undefined);

      return db
        .update(productvariants)
        .set({ name: newName, sku: newSku })
        .where(eq(productvariants.id, row.productVariantId));
    })
  );
}

export async function refreshProductVariantsForVariantValue(variantValueId: number) {
  const variantRows = await db
    .select({
      productVariantId: productvariants.id,
      variantName: productvariants.name,
      sku: productvariants.sku,
      brandId: products.brandId,
    })
    .from(productvariantattributes)
    .innerJoin(productvariants, eq(productvariantattributes.productVariantId, productvariants.id))
    .innerJoin(products, eq(productvariants.productId, products.id))
    .where(eq(productvariantattributes.variantValueId, variantValueId));

  await rebuildVariantSkuData(
    variantRows.map((r) => ({
      productVariantId: r.productVariantId,
      variantName: r.variantName ?? null,
      sku: r.sku ?? null,
      brandId: r.brandId ?? null,
    }))
  );
}

export async function refreshProductVariantsForProduct(productId: number) {
  const variantRows = await db
    .select({
      productVariantId: productvariants.id,
      variantName: productvariants.name,
      sku: productvariants.sku,
      brandId: products.brandId,
    })
    .from(productvariants)
    .innerJoin(products, eq(productvariants.productId, products.id))
    .where(eq(productvariants.productId, productId));

  await rebuildVariantSkuData(
    variantRows.map((r) => ({
      productVariantId: r.productVariantId,
      variantName: r.variantName ?? null,
      sku: r.sku ?? null,
      brandId: r.brandId ?? null,
    }))
  );
}
