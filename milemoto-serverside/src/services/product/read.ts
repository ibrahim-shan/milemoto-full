import { and, asc, desc, eq, exists, gte, inArray, isNull, like, lte, or, sql } from 'drizzle-orm';
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
  unitfields,
  unitgroups,
  unitvalues,
  variantvalues,
  vendors,
  warranties,
} from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import type { ProductSpecification, ProductVariant } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/product.helpers.js';
import { productSelect, type ProductVariantListItem } from './shared.js';

export async function listProducts(query: ListQueryDto) {
  const offset = (query.page - 1) * query.limit;
  const filterMode = query.filterMode ?? 'all';
  const categoryIds = Array.isArray(query.categoryId)
    ? query.categoryId
    : query.categoryId
      ? [query.categoryId]
      : [];
  const subCategoryIds = Array.isArray(query.subCategoryId)
    ? query.subCategoryId
    : query.subCategoryId
      ? [query.subCategoryId]
      : [];
  const brandIds = Array.isArray(query.brandId)
    ? query.brandId
    : query.brandId
      ? [query.brandId]
      : [];
  const vendorIds = Array.isArray(query.vendorId)
    ? query.vendorId
    : query.vendorId
      ? [query.vendorId]
      : [];
  const gradeIds = Array.isArray(query.gradeId)
    ? query.gradeId
    : query.gradeId
      ? [query.gradeId]
      : [];
  const warrantyIds = Array.isArray(query.warrantyId)
    ? query.warrantyId
    : query.warrantyId
      ? [query.warrantyId]
      : [];
  const specValueIds = Array.isArray(query.specValueId)
    ? query.specValueId
    : query.specValueId
      ? [query.specValueId]
      : [];

  const searchFilter = query.search
    ? (() => {
        const search = query.search.trim();
        // Use FULLTEXT for 3+ char searches (MySQL ft_min_word_len default)
        if (search.length >= 3) {
          return or(
            sql`MATCH(${products.name}) AGAINST(${search} IN NATURAL LANGUAGE MODE)`,
            exists(
              db
                .select({ one: sql<number>`1` })
                .from(productvariants)
                .where(
                  and(
                    eq(productvariants.productId, products.id),
                    sql`MATCH(${productvariants.name}, ${productvariants.sku}) AGAINST(${search} IN NATURAL LANGUAGE MODE)`
                  )
                )
            ),
            // Also check barcode with LIKE (not in FULLTEXT index)
            exists(
              db
                .select({ one: sql<number>`1` })
                .from(productvariants)
                .where(
                  and(
                    eq(productvariants.productId, products.id),
                    like(productvariants.barcode, `%${search}%`)
                  )
                )
            )
          );
        }
        // Fall back to LIKE for short queries
        return or(
          like(products.name, `%${search}%`),
          exists(
            db
              .select({ one: sql<number>`1` })
              .from(productvariants)
              .where(
                and(
                  eq(productvariants.productId, products.id),
                  or(
                    like(productvariants.sku, `%${search}%`),
                    like(productvariants.barcode, `%${search}%`)
                  )
                )
              )
          )
        );
      })()
    : undefined;

  const optionalFilters = [
    categoryIds.length > 0 ? inArray(products.categoryId, categoryIds) : undefined,
    subCategoryIds.length > 0 ? inArray(products.subCategoryId, subCategoryIds) : undefined,
    brandIds.length > 0 ? inArray(products.brandId, brandIds) : undefined,
    vendorIds.length > 0 ? inArray(products.vendorId, vendorIds) : undefined,
    gradeIds.length > 0 ? inArray(products.gradeId, gradeIds) : undefined,
    warrantyIds.length > 0 ? inArray(products.warrantyId, warrantyIds) : undefined,
    specValueIds.length > 0
      ? exists(
          db
            .select({ one: sql<number>`1` })
            .from(productspecifications)
            .where(
              and(
                eq(productspecifications.productId, products.id),
                inArray(productspecifications.unitValueId, specValueIds)
              )
            )
        )
      : undefined,
    query.status ? eq(products.status, query.status) : undefined,
    query.isFeatured !== undefined ? eq(products.isFeatured, query.isFeatured) : undefined,
    query.sku
      ? exists(
          db
            .select({ one: sql<number>`1` })
            .from(productvariants)
            .where(
              and(eq(productvariants.productId, products.id), like(productvariants.sku, `%${query.sku}%`))
            )
        )
      : undefined,
    query.priceMin !== undefined || query.priceMax !== undefined
      ? exists(
          db
            .select({ one: sql<number>`1` })
            .from(productvariants)
            .where(
              and(
                eq(productvariants.productId, products.id),
                query.priceMin !== undefined ? gte(productvariants.price, query.priceMin) : undefined,
                query.priceMax !== undefined ? lte(productvariants.price, query.priceMax) : undefined
              )
            )
        )
      : undefined,
  ].filter(Boolean);

  const structuredFilter =
    optionalFilters.length === 0
      ? undefined
      : filterMode === 'any'
        ? or(...optionalFilters)
        : and(...optionalFilters);
  const where = and(searchFilter, structuredFilter);
  const sortBy = query.sortBy ?? 'createdAt';
  const sortDir = query.sortDir ?? 'desc';
  const subCategorySortExpr = sql<string | null>`(
    SELECT c2.name
    FROM categories c2
    WHERE c2.id = ${products.subCategoryId}
    LIMIT 1
  )`;
  const sortColumn =
    sortBy === 'id'
      ? products.id
      : sortBy === 'name'
        ? products.name
        : sortBy === 'brand'
          ? brands.name
          : sortBy === 'category'
            ? categories.name
            : sortBy === 'subCategory'
              ? subCategorySortExpr
              : sortBy === 'grade'
                ? grades.name
                : sortBy === 'warranty'
                  ? warranties.name
                  : sortBy === 'featured'
                    ? products.isFeatured
                    : sortBy === 'status'
                      ? products.status
                      : sortBy === 'updatedAt'
                        ? products.updatedAt
                        : products.createdAt;
  const orderByClause = sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const [items, countRows, variantCountRows] = await Promise.all([
    db
      .select({
        ...productSelect,
        brandName: brands.name,
        categoryName: categories.name,
        subCategoryName: sql<
          string | null
        >`(SELECT c2.name FROM categories c2 WHERE c2.id = ${products.subCategoryId} LIMIT 1)`,
        gradeName: grades.name,
        warrantyName: warranties.name,
        imagePath: sql<
          string | null
        >`(SELECT pi.imagePath FROM productimages pi WHERE pi.productId = ${products.id} AND pi.productVariantId IS NULL ORDER BY pi.isPrimary DESC, pi.id ASC LIMIT 1)`,
        price: sql<
          number | null
        >`(SELECT pv.price FROM productvariants pv WHERE pv.productId = ${products.id} ORDER BY pv.id ASC LIMIT 1)`,
        sku: sql<
          string | null
        >`(SELECT pv.sku FROM productvariants pv WHERE pv.productId = ${products.id} ORDER BY pv.id ASC LIMIT 1)`,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(grades, eq(products.gradeId, grades.id))
      .leftJoin(vendors, eq(products.vendorId, vendors.id))
      .leftJoin(warranties, eq(products.warrantyId, warranties.id))
      .where(where)
      .orderBy(orderByClause, desc(products.id))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(products)
      .where(where),
    db
      .select({ totalVariants: sql<number>`count(${productvariants.id})` })
      .from(productvariants)
      .innerJoin(products, eq(productvariants.productId, products.id))
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);
  const totalVariants = Number(variantCountRows[0]?.totalVariants ?? 0);

  return buildPaginatedResponse(
    {
      items,
      totalCount: total,
      page: query.page,
      limit: query.limit,
    },
    { totalVariants }
  );
}

export async function listAllProductVariants(query: {
  page: number;
  limit: number;
  search?: string | undefined;
}) {
  const offset = (query.page - 1) * query.limit;

  const filters = [
    query.search
      ? (() => {
          const search = query.search.trim();
          // Use FULLTEXT for 3+ char searches
          if (search.length >= 3) {
            return or(
              sql`MATCH(${productvariants.name}, ${productvariants.sku}) AGAINST(${search} IN NATURAL LANGUAGE MODE)`,
              sql`MATCH(${products.name}) AGAINST(${search} IN NATURAL LANGUAGE MODE)`,
              like(productvariants.barcode, `%${search}%`)
            );
          }
          // Fall back to LIKE for short queries
          return or(
            like(productvariants.sku, `%${search}%`),
            like(productvariants.barcode, `%${search}%`),
            like(productvariants.name, `%${search}%`),
            like(products.name, `%${search}%`)
          );
        })()
      : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db
      .select({
        id: productvariants.id,
        sku: productvariants.sku,
        barcode: productvariants.barcode,
        price: productvariants.price,
        variantName: productvariants.name,
        productName: products.name,
        imagePath: sql<
          string | null
        >`(SELECT pi.imagePath FROM productimages pi WHERE pi.productId = ${products.id} ORDER BY pi.isPrimary DESC, pi.id ASC LIMIT 1)`,
      })
      .from(productvariants)
      .innerJoin(products, eq(productvariants.productId, products.id))
      .where(where)
      .orderBy(asc(products.name), asc(productvariants.sku))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(${productvariants.id})` })
      .from(productvariants)
      .innerJoin(products, eq(productvariants.productId, products.id))
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: items as ProductVariantListItem[],
    totalCount: total,
    page: query.page,
    limit: query.limit,
  });
}

export async function getProduct(id: number) {
  const rows = await db
    .select({
      ...productSelect,
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
    .where(eq(products.id, id))
    .limit(1);

  const product = rows[0];
  if (!product) return null;

  const variantRows = await db
    .select()
    .from(productvariants)
    .where(eq(productvariants.productId, id));
  const variantIds = variantRows.map((v) => v.id);

  const [attrRows, variantImgRows] = await Promise.all([
    variantIds.length
      ? db
          .select({
            id: productvariantattributes.id,
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
  ]);

  const attrsByVariant = new Map<
    number,
    { variantValueId: number; productVariantId: number; valueName: string }[]
  >();
  for (const a of attrRows) {
    const list = attrsByVariant.get(a.productVariantId) ?? [];
    list.push({
      productVariantId: a.productVariantId,
      variantValueId: a.variantValueId,
      valueName: a.valueName,
    });
    attrsByVariant.set(a.productVariantId, list);
  }

  const imgByVariant = new Map<number, string>();
  for (const img of variantImgRows) {
    if (img.productVariantId) imgByVariant.set(img.productVariantId, img.imagePath);
  }

  const variants = variantRows.map((v) => {
    const attrs = attrsByVariant.get(v.id) ?? [];
    const computedName =
      attrs.length > 0
        ? attrs
            .map((a) => a.valueName)
            .filter(Boolean)
            .join(' / ')
        : v.name;
    return {
      ...v,
      name: computedName,
      attributes: attrs.map(({ productVariantId, variantValueId }) => ({
        productVariantId,
        variantValueId,
      })),
      imagePath: imgByVariant.get(v.id) ?? null,
    } as unknown as ProductVariant;
  });

  const baseImages = await db
    .select({ imagePath: productimages.imagePath })
    .from(productimages)
    .where(and(eq(productimages.productId, id), isNull(productimages.productVariantId)))
    .orderBy(desc(productimages.isPrimary), asc(productimages.id));

  const specRows = await db
    .select({
      specId: productspecifications.id,
      unitGroupId: productspecifications.unitGroupId,
      unitValueId: productspecifications.unitValueId,
      groupName: unitgroups.name,
      valueName: unitvalues.name,
      valueCode: unitvalues.code,
    })
    .from(productspecifications)
    .innerJoin(unitgroups, eq(productspecifications.unitGroupId, unitgroups.id))
    .innerJoin(unitvalues, eq(productspecifications.unitValueId, unitvalues.id))
    .where(eq(productspecifications.productId, id));

  const specIds = specRows.map((s) => s.specId);
  const specFieldRows = specIds.length
    ? await db
        .select({
          productSpecificationId: productspecificationfields.productSpecificationId,
          unitFieldId: productspecificationfields.unitFieldId,
          value: productspecificationfields.value,
          fieldName: unitfields.name,
        })
        .from(productspecificationfields)
        .innerJoin(unitfields, eq(productspecificationfields.unitFieldId, unitfields.id))
        .where(inArray(productspecificationfields.productSpecificationId, specIds))
    : [];

  const fieldsBySpec = new Map<
    number,
    { unitFieldId: number; value: string | null; fieldName: string }[]
  >();
  for (const f of specFieldRows) {
    const list = fieldsBySpec.get(f.productSpecificationId) ?? [];
    list.push({ unitFieldId: f.unitFieldId, value: f.value ?? null, fieldName: f.fieldName });
    fieldsBySpec.set(f.productSpecificationId, list);
  }

  const specifications = specRows.map((s) => ({
    id: s.specId,
    productId: id,
    unitGroupId: s.unitGroupId,
    unitValueId: s.unitValueId,
    groupName: s.groupName,
    valueName: s.valueName,
    valueCode: s.valueCode,
    fields: fieldsBySpec.get(s.specId) ?? [],
  })) as unknown as ProductSpecification[];

  return {
    ...product,
    variants,
    images: baseImages.map((r) => r.imagePath),
    specifications,
  };
}
