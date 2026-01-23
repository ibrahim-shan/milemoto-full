import { eq } from 'drizzle-orm';
import {
  products,
  productvariantattributes,
  productvariants,
  variantvalues,
} from '@milemoto/types';
import type { CollectionMatchType, CollectionRule } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { NUMERIC_OPERATORS, STRING_OPERATORS, coerceNumber } from './shared.js';

export type ProductContext = {
  productId: number;
  brandId: number | null;
  categoryId: number | null;
  subCategoryId: number | null;
  gradeId: number | null;
  warrantyId: number | null;
  status: string | null;
  variantValues: { value: string; slug: string }[];
};

export function evaluateRules(
  rules: CollectionRule[],
  matchType: CollectionMatchType,
  ctx: ProductContext
) {
  if (!rules || rules.length === 0) return false;

  const results = rules.map((rule) => evaluateRule(rule, ctx));
  return matchType === 'all' ? results.every(Boolean) : results.some(Boolean);
}

function evaluateRule(rule: CollectionRule, ctx: ProductContext) {
  const target = resolveField(rule.field, ctx);
  if (target === undefined) return false;

  const op = rule.operator;
  const value = rule.value;

  if (Array.isArray(target)) {
    return target.some((entry) => compareValues(entry, value, op));
  }
  return compareValues(target, value, op);
}

function compareValues(
  target: string | number | boolean | null,
  value: string | number | boolean,
  operator: string
) {
  if (target === null || target === undefined) return false;

  if (NUMERIC_OPERATORS.has(operator)) {
    const left = coerceNumber(target);
    const right = coerceNumber(value);
    if (left === null || right === null) return false;
    switch (operator) {
      case 'equals':
        return left === right;
      case 'not_equals':
        return left !== right;
      case 'lt':
        return left < right;
      case 'gt':
        return left > right;
      default:
        return false;
    }
  }

  if (STRING_OPERATORS.has(operator)) {
    const left = String(target).toLowerCase();
    const right = String(value).toLowerCase();
    switch (operator) {
      case 'equals':
        return left === right;
      case 'not_equals':
        return left !== right;
      case 'contains':
        return left.includes(right);
      default:
        return false;
    }
  }

  return false;
}

function resolveField(field: string, ctx: ProductContext) {
  switch (field) {
    case 'brandId':
      return ctx.brandId;
    case 'categoryId':
      return ctx.categoryId;
    case 'subCategoryId':
      return ctx.subCategoryId;
    case 'gradeId':
      return ctx.gradeId;
    case 'warrantyId':
      return ctx.warrantyId;
    case 'status':
      return ctx.status;
    case 'variant.attribute.slug':
      return ctx.variantValues.map((v) => v.slug);
    case 'variant.attribute.value':
      return ctx.variantValues.map((v) => v.value);
    default:
      return undefined;
  }
}

export async function buildProductContext(productId: number): Promise<ProductContext | null> {
  const [product] = await db
    .select({
      id: products.id,
      brandId: products.brandId,
      categoryId: products.categoryId,
      subCategoryId: products.subCategoryId,
      gradeId: products.gradeId,
      warrantyId: products.warrantyId,
      status: products.status,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) return null;

  const attrRows = await db
    .select({
      value: variantvalues.value,
      slug: variantvalues.slug,
    })
    .from(productvariantattributes)
    .innerJoin(productvariants, eq(productvariantattributes.productVariantId, productvariants.id))
    .innerJoin(variantvalues, eq(productvariantattributes.variantValueId, variantvalues.id))
    .where(eq(productvariants.productId, productId));

  return {
    productId,
    brandId: product.brandId !== null ? Number(product.brandId) : null,
    categoryId: product.categoryId !== null ? Number(product.categoryId) : null,
    subCategoryId: product.subCategoryId !== null ? Number(product.subCategoryId) : null,
    gradeId: product.gradeId !== null ? Number(product.gradeId) : null,
    warrantyId: product.warrantyId !== null ? Number(product.warrantyId) : null,
    status: product.status ? String(product.status) : null,
    variantValues: attrRows.map((r) => ({
      value: r.value,
      slug: r.slug,
    })),
  };
}
