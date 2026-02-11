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

    const toArray = (v: number | number[] | undefined): number[] =>
        v === undefined ? [] : Array.isArray(v) ? v : [v];

    const categoryIds = toArray(query.categoryId);
    const subCategoryIds = toArray(query.subCategoryId);
    const brandIds = toArray(query.brandId);
    const gradeIds = toArray(query.gradeId);

    const filters = [
        // Only active products
        eq(products.status, 'active'),
        categoryIds.length > 0 ? inArray(products.categoryId, categoryIds) : undefined,
        subCategoryIds.length > 0 ? inArray(products.subCategoryId, subCategoryIds) : undefined,
        brandIds.length > 0 ? inArray(products.brandId, brandIds) : undefined,
        gradeIds.length > 0 ? inArray(products.gradeId, gradeIds) : undefined,
        // Price range filter (on the lowest variant price)
        query.minPrice !== undefined
            ? sql`(SELECT MIN(pv.price) FROM productvariants pv WHERE pv.productId = ${products.id} AND pv.status = 'active') >= ${query.minPrice}`
            : undefined,
        query.maxPrice !== undefined
            ? sql`(SELECT MIN(pv.price) FROM productvariants pv WHERE pv.productId = ${products.id} AND pv.status = 'active') <= ${query.maxPrice}`
            : undefined,
        // Search
        query.search
            ? (() => {
                const search = query.search.trim();
                if (search.length >= 3) {
                    return or(
                        sql`MATCH(${products.name}) AGAINST(${search} IN NATURAL LANGUAGE MODE)`,
                        like(products.name, `%${search}%`)
                    );
                }
                return like(products.name, `%${search}%`);
            })()
            : undefined,
    ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

    const where = and(...filters);

    // Determine sort order
    let orderBy;
    switch (query.sort) {
        case 'price-asc':
            orderBy = asc(
                sql`(SELECT MIN(pv.price) FROM productvariants pv WHERE pv.productId = ${products.id} AND pv.status = 'active')`
            );
            break;
        case 'price-desc':
            orderBy = desc(
                sql`(SELECT MIN(pv.price) FROM productvariants pv WHERE pv.productId = ${products.id} AND pv.status = 'active')`
            );
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
                >`(SELECT pi.imagePath FROM productimages pi WHERE pi.productId = ${products.id} ORDER BY pi.isPrimary DESC, pi.id ASC LIMIT 1)`,
                startingPrice: sql<
                    number | null
                >`(SELECT MIN(pv.price) FROM productvariants pv WHERE pv.productId = ${products.id} AND pv.status = 'active')`,
            })
            .from(products)
            .leftJoin(brands, eq(products.brandId, brands.id))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(where)
            .orderBy(orderBy)
            .limit(query.limit)
            .offset(offset),
        db
            .select({ total: sql<number>`count(*)` })
            .from(products)
            .where(where),
    ]);

    const total = Number(countRows[0]?.total ?? 0);

    return buildPaginatedResponse({
        items: items as StorefrontProductListItem[],
        totalCount: total,
        page: query.page,
        limit: query.limit,
    });
}

// ── Get single product by slug (public, active only) ────────────────────────
export async function getStorefrontProductBySlug(
    slug: string
): Promise<StorefrontProductDetail | null> {
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
        .where(
            and(eq(productvariants.productId, productId), eq(productvariants.status, 'active'))
        );
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
    const attrsByVariant = new Map<
        number,
        { variantValueId: number; valueName: string }[]
    >();
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
                ? attrs.map((a) => a.valueName).filter(Boolean).join(' / ')
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
        variants,
        specifications,
    };
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
            count: sql<number>`count(${products.id})`,
        })
        .from(categories)
        .innerJoin(products, and(eq(products.categoryId, categories.id), activeFilter))
        .groupBy(categories.id, categories.name)
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
            and(
                sql`sub_cat.id = ${products.subCategoryId}`,
                activeFilter
            )
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

    return {
        categories: categoryFilters,
        brands: brandFilters,
        grades: gradeFilters,
    };
}
