import { and, asc, desc, eq, inArray, isNull, like, or, sql } from 'drizzle-orm';
import {
  brands,
  categories,
  grades,
  productimages,
  products,
  productspecificationfields,
  productspecifications,
  productvariantattributes,
  productvariants,
  stocklevels,
  unitfields,
  unitgroups,
  unitvalues,
  variantvalues,
  warranties,
} from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { getStockDisplaySettings } from '../siteSettings/read.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import type {
  StorefrontListQueryDto,
  StorefrontProductListItem,
  StorefrontProductDetail,
  StorefrontVariant,
  StorefrontSpec,
  StorefrontFiltersResponse,
  StorefrontCategoryFilter,
  StorefrontFilterItem,
} from '@milemoto/types';

// ── List products (public, active only) ─────────────────────────────────────
export async function listStorefrontProducts(query: StorefrontListQueryDto) {
  const offset = (query.page - 1) * query.limit;
  const stockAvailableAgg = db
    .select({
      productVariantId: stocklevels.productVariantId,
      available:
        sql<number>`SUM(COALESCE(${stocklevels.onHand}, 0) - COALESCE(${stocklevels.allocated}, 0))`.as(
          'available'
        ),
    })
    .from(stocklevels)
    .groupBy(stocklevels.productVariantId)
    .as('stock_available_agg');

  const activeVariantPriceAgg = db
    .select({
      productId: productvariants.productId,
      minPrice: sql<number>`MIN(${productvariants.price})`.as('min_price'),
      variantCount: sql<number>`COUNT(*)`.as('variant_count'),
      singleVariantId: sql<number>`MIN(${productvariants.id})`.as('single_variant_id'),
      totalAvailable: sql<number>`SUM(COALESCE(${stockAvailableAgg.available}, 0))`.as(
        'total_available'
      ),
    })
    .from(productvariants)
    .leftJoin(stockAvailableAgg, eq(stockAvailableAgg.productVariantId, productvariants.id))
    .where(eq(productvariants.status, 'active'))
    .groupBy(productvariants.productId)
    .as('active_variant_price_agg');

  const toArray = (v: number | number[] | undefined): number[] =>
    v === undefined ? [] : Array.isArray(v) ? v : [v];

  const categoryIds = toArray(query.categoryId);
  const subCategoryIds = toArray(query.subCategoryId);
  const brandIds = toArray(query.brandId);
  const gradeIds = toArray(query.gradeId);
  const searchText = query.search?.trim();

  const runListQuery = async (useFulltextSearch: boolean) => {
    const filters = [
      // Only active products
      eq(products.status, 'active'),
      query.isFeatured !== undefined ? eq(products.isFeatured, query.isFeatured) : undefined,
      categoryIds.length > 0 ? inArray(products.categoryId, categoryIds) : undefined,
      subCategoryIds.length > 0 ? inArray(products.subCategoryId, subCategoryIds) : undefined,
      brandIds.length > 0 ? inArray(products.brandId, brandIds) : undefined,
      gradeIds.length > 0 ? inArray(products.gradeId, gradeIds) : undefined,
      // Price range filter (on the lowest variant price)
      query.minPrice !== undefined
        ? sql`${activeVariantPriceAgg.minPrice} >= ${query.minPrice}`
        : undefined,
      query.maxPrice !== undefined
        ? sql`${activeVariantPriceAgg.minPrice} <= ${query.maxPrice}`
        : undefined,
      // Search
      searchText
        ? (() => {
            if (useFulltextSearch && searchText.length >= 3) {
              return or(
                sql`MATCH(${products.name}) AGAINST(${searchText} IN NATURAL LANGUAGE MODE)`,
                like(products.name, `%${searchText}%`)
              );
            }
            return like(products.name, `%${searchText}%`);
          })()
        : undefined,
    ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

    const where = and(...filters);

    // Determine sort order
    let orderBy;
    switch (query.sort) {
      case 'price-asc':
        orderBy = asc(activeVariantPriceAgg.minPrice);
        break;
      case 'price-desc':
        orderBy = desc(activeVariantPriceAgg.minPrice);
        break;
      case 'name-asc':
        orderBy = asc(products.name);
        break;
      default:
        orderBy = desc(products.createdAt);
    }

    const [items, countRows] = await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          shortDescription: products.shortDescription,
          brandName: brands.name,
          categoryName: categories.name,
          imageSrc: sql<
            string | null
          >`(SELECT pi.imagePath FROM productimages pi WHERE pi.productId = ${products.id} AND pi.productVariantId IS NULL ORDER BY pi.isPrimary DESC, pi.id ASC LIMIT 1)`,
          startingPrice: activeVariantPriceAgg.minPrice,
          totalAvailable: sql<number>`GREATEST(0, COALESCE(${activeVariantPriceAgg.totalAvailable}, 0))`,
          variantCount: activeVariantPriceAgg.variantCount,
          singleVariantId: sql<
            number | null
          >`CASE WHEN ${activeVariantPriceAgg.variantCount} = 1 THEN ${activeVariantPriceAgg.singleVariantId} ELSE NULL END`,
          singleVariantAvailable: sql<
            number | null
          >`CASE WHEN ${activeVariantPriceAgg.variantCount} = 1 THEN GREATEST(0, ${activeVariantPriceAgg.totalAvailable}) ELSE NULL END`,
        })
        .from(products)
        .innerJoin(activeVariantPriceAgg, eq(activeVariantPriceAgg.productId, products.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(where)
        .orderBy(orderBy)
        .limit(query.limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)` })
        .from(products)
        .innerJoin(activeVariantPriceAgg, eq(activeVariantPriceAgg.productId, products.id))
        .where(where),
    ]);

    const total = Number(countRows[0]?.total ?? 0);

    return buildPaginatedResponse({
      items: items as StorefrontProductListItem[],
      totalCount: total,
      page: query.page,
      limit: query.limit,
    });
  };

  try {
    return await runListQuery(true);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const canFallback = !!searchText && searchText.length >= 3;
    const missingFulltextIndex =
      message.includes('FULLTEXT') &&
      (message.includes("Can't find FULLTEXT index") ||
        message.includes('FULLTEXT index matching the column list'));

    if (canFallback && missingFulltextIndex) {
      return runListQuery(false);
    }

    throw error;
  }
}

// ── Get single product by slug (public, active only) ────────────────────────
export async function getStorefrontProductBySlug(
  slug: string
): Promise<StorefrontProductDetail | null> {
  const stockDisplaySettings = await getStockDisplaySettings();
  // 1. Get the product
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      shortDescription: products.shortDescription,
      longDescription: products.longDescription,
      brandName: brands.name,
      categoryName: categories.name,
      subCategoryName: sql<
        string | null
      >`(SELECT c2.name FROM categories c2 WHERE c2.id = ${products.subCategoryId} LIMIT 1)`,
      gradeName: grades.name,
      warrantyName: warranties.name,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(grades, eq(products.gradeId, grades.id))
    .leftJoin(warranties, eq(products.warrantyId, warranties.id))
    .where(and(eq(products.slug, slug), eq(products.status, 'active')))
    .limit(1);

  const product = rows[0];
  if (!product) return null;
  const productId = product.id;

  // 2. Get active variants
  const variantRows = await db
    .select()
    .from(productvariants)
    .where(and(eq(productvariants.productId, productId), eq(productvariants.status, 'active')));
  const variantIds = variantRows.map((v) => v.id);

  // 3. Get variant attributes, images, and stock in parallel
  const [attrRows, variantImgRows, stockRows] = await Promise.all([
    variantIds.length
      ? db
          .select({
            productVariantId: productvariantattributes.productVariantId,
            variantValueId: productvariantattributes.variantValueId,
            valueName: variantvalues.value,
          })
          .from(productvariantattributes)
          .innerJoin(variantvalues, eq(productvariantattributes.variantValueId, variantvalues.id))
          .where(inArray(productvariantattributes.productVariantId, variantIds))
      : Promise.resolve([]),
    variantIds.length
      ? db
          .select({
            productVariantId: productimages.productVariantId,
            imagePath: productimages.imagePath,
          })
          .from(productimages)
          .where(inArray(productimages.productVariantId, variantIds))
      : Promise.resolve([]),
    variantIds.length
      ? db
          .select({
            productVariantId: stocklevels.productVariantId,
            onHand: stocklevels.onHand,
            allocated: stocklevels.allocated,
          })
          .from(stocklevels)
          .where(inArray(stocklevels.productVariantId, variantIds))
      : Promise.resolve([]),
  ]);

  // Build lookup maps
  const attrsByVariant = new Map<number, { variantValueId: number; valueName: string }[]>();
  for (const a of attrRows) {
    const list = attrsByVariant.get(a.productVariantId) ?? [];
    list.push({ variantValueId: a.variantValueId, valueName: a.valueName });
    attrsByVariant.set(a.productVariantId, list);
  }

  const imgByVariant = new Map<number, string>();
  for (const img of variantImgRows) {
    if (img.productVariantId) imgByVariant.set(img.productVariantId, img.imagePath);
  }

  // Sum stock across all locations per variant
  const stockByVariant = new Map<number, number>();
  for (const s of stockRows) {
    const current = stockByVariant.get(s.productVariantId) ?? 0;
    stockByVariant.set(
      s.productVariantId,
      current + (Number(s.onHand ?? 0) - Number(s.allocated ?? 0))
    );
  }

  // 4. Build variant list
  const variants: StorefrontVariant[] = variantRows.map((v) => {
    const attrs = attrsByVariant.get(v.id) ?? [];
    const computedName =
      attrs.length > 0
        ? attrs
            .map((a) => a.valueName)
            .filter(Boolean)
            .join(' / ')
        : v.name;
    return {
      id: v.id,
      name: computedName,
      sku: v.sku,
      price: Number(v.price),
      imagePath: imgByVariant.get(v.id) ?? null,
      available: Math.max(0, stockByVariant.get(v.id) ?? 0),
      attributes: attrs,
    };
  });

  // 5. Get base product images
  const baseImages = await db
    .select({ imagePath: productimages.imagePath })
    .from(productimages)
    .where(and(eq(productimages.productId, productId), isNull(productimages.productVariantId)))
    .orderBy(desc(productimages.isPrimary), asc(productimages.id));

  // 6. Get specifications
  const specRows = await db
    .select({
      specId: productspecifications.id,
      groupName: unitgroups.name,
      valueName: unitvalues.name,
    })
    .from(productspecifications)
    .innerJoin(unitgroups, eq(productspecifications.unitGroupId, unitgroups.id))
    .innerJoin(unitvalues, eq(productspecifications.unitValueId, unitvalues.id))
    .where(eq(productspecifications.productId, productId));

  const specIds = specRows.map((s) => s.specId);
  const specFieldRows = specIds.length
    ? await db
        .select({
          productSpecificationId: productspecificationfields.productSpecificationId,
          value: productspecificationfields.value,
          fieldName: unitfields.name,
        })
        .from(productspecificationfields)
        .innerJoin(unitfields, eq(productspecificationfields.unitFieldId, unitfields.id))
        .where(inArray(productspecificationfields.productSpecificationId, specIds))
    : [];

  const fieldsBySpec = new Map<number, { fieldName: string; value: string | null }[]>();
  for (const f of specFieldRows) {
    const list = fieldsBySpec.get(f.productSpecificationId) ?? [];
    list.push({ fieldName: f.fieldName, value: f.value ?? null });
    fieldsBySpec.set(f.productSpecificationId, list);
  }

  const specifications: StorefrontSpec[] = specRows.map((s) => ({
    groupName: s.groupName,
    valueName: s.valueName,
    fields: fieldsBySpec.get(s.specId) ?? [],
  }));

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
    images: baseImages.map((r) => r.imagePath),
    brandName: product.brandName,
    categoryName: product.categoryName,
    subCategoryName: product.subCategoryName,
    gradeName: product.gradeName,
    warrantyName: product.warrantyName,
    stockDisplayMode: stockDisplaySettings.productStockDisplayMode,
    lowStockThreshold: stockDisplaySettings.lowStockThreshold,
    variants,
    specifications,
  };
}

export async function getStorefrontProductStatusBySlug(
  slug: string
): Promise<'active' | 'inactive' | 'not_found'> {
  const rows = await db
    .select({
      status: products.status,
    })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) return 'not_found';
  return row.status === 'active' ? 'active' : 'inactive';
}

// ── Get filter options (categories, brands, grades with counts) ─────────────
export async function getStorefrontFilters(): Promise<StorefrontFiltersResponse> {
  // Active products base
  const activeFilter = eq(products.status, 'active');

  // Categories used by active products (as main category)
  const catRows = await db
    .select({
      id: categories.id,
      name: categories.name,
      imageUrl: categories.imageUrl,
      count: sql<number>`count(${products.id})`,
    })
    .from(categories)
    .innerJoin(products, and(eq(products.categoryId, categories.id), activeFilter))
    .groupBy(categories.id, categories.name, categories.imageUrl)
    .orderBy(asc(categories.name));

  // Sub-categories used by active products
  const subCatRows = await db
    .select({
      parentId: products.categoryId,
      id: sql<number>`sub_cat.id`,
      name: sql<string>`sub_cat.name`,
      count: sql<number>`count(${products.id})`,
    })
    .from(products)
    .innerJoin(
      sql`categories sub_cat`,
      and(sql`sub_cat.id = ${products.subCategoryId}`, activeFilter)
    )
    .groupBy(products.categoryId, sql`sub_cat.id`, sql`sub_cat.name`)
    .orderBy(sql`sub_cat.name`);

  // Build category tree
  const subsByParent = new Map<number, StorefrontFilterItem[]>();
  for (const s of subCatRows) {
    const list = subsByParent.get(Number(s.parentId)) ?? [];
    list.push({ id: Number(s.id), name: String(s.name), count: Number(s.count) });
    subsByParent.set(Number(s.parentId), list);
  }

  const categoryFilters: StorefrontCategoryFilter[] = catRows.map((c) => ({
    id: c.id,
    name: c.name,
    count: Number(c.count),
    imageUrl: c.imageUrl ?? null,
    subCategories: subsByParent.get(c.id) ?? [],
  }));

  // Brands with counts
  const brandRows = await db
    .select({
      id: brands.id,
      name: brands.name,
      count: sql<number>`count(${products.id})`,
    })
    .from(brands)
    .innerJoin(products, and(eq(products.brandId, brands.id), activeFilter))
    .groupBy(brands.id, brands.name)
    .orderBy(asc(brands.name));

  const brandFilters: StorefrontFilterItem[] = brandRows.map((b) => ({
    id: b.id,
    name: b.name,
    count: Number(b.count),
  }));

  // Grades with counts
  const gradeRows = await db
    .select({
      id: grades.id,
      name: grades.name,
      count: sql<number>`count(${products.id})`,
    })
    .from(grades)
    .innerJoin(products, and(eq(products.gradeId, grades.id), activeFilter))
    .groupBy(grades.id, grades.name)
    .orderBy(asc(grades.name));

  const gradeFilters: StorefrontFilterItem[] = gradeRows.map((g) => ({
    id: g.id,
    name: g.name,
    count: Number(g.count),
  }));

  // Max variant price across all active products
  const [priceRow] = await db
    .select({
      maxPrice: sql<number>`COALESCE(MAX(${productvariants.price}), 1000)`,
    })
    .from(productvariants)
    .innerJoin(products, and(eq(productvariants.productId, products.id), activeFilter))
    .where(eq(productvariants.status, 'active'));

  const maxPrice = Math.ceil(Number(priceRow?.maxPrice ?? 1000));

  return {
    categories: categoryFilters,
    brands: brandFilters,
    grades: gradeFilters,
    maxPrice,
  };
}
