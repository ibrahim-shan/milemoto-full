import { and, asc, desc, eq, gte, isNotNull, isNull, like, ne, or, sql } from 'drizzle-orm';
import { orderitems, orders, productreviews, products, users } from '@milemoto/types';
import type {
  AdminReviewsListQueryDto,
  AdminReviewsListResponse,
  ProductReviewEligibilityResponse,
  ProductReviewItemResponse,
  ProductReviewsResponse,
  ProductReviewSummaryResponse,
} from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';

function toReviewResponse(row: {
  id: number;
  productId: number;
  userId: number;
  userName: string;
  verifiedPurchase?: number | boolean | null;
  rating: number;
  comment: string;
  status: string;
  editedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): ProductReviewItemResponse {
  return {
    id: Number(row.id),
    productId: Number(row.productId),
    userId: Number(row.userId),
    userName: row.userName,
    verifiedPurchase: Number(row.verifiedPurchase ?? 0) === 1,
    rating: Number(row.rating),
    comment: row.comment,
    status: row.status as ProductReviewItemResponse['status'],
    editedAt: row.editedAt ? new Date(row.editedAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function toIsoOrNull(value: Date | string | null): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function parseSuspiciousReasons(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
  } catch {
    return [];
  }
}

function buildSummary(rows: Array<{ rating: number }>): ProductReviewSummaryResponse {
  const totalReviews = rows.length;
  const sum = rows.reduce((acc, row) => acc + Number(row.rating), 0);
  const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const row of rows) {
    const idx = Math.min(5, Math.max(1, Number(row.rating))) - 1;
    counts[idx] = (counts[idx] ?? 0) + 1;
  }

  return {
    averageRating: totalReviews > 0 ? Number((sum / totalReviews).toFixed(2)) : 0,
    totalReviews,
    count1: counts[0] ?? 0,
    count2: counts[1] ?? 0,
    count3: counts[2] ?? 0,
    count4: counts[3] ?? 0,
    count5: counts[4] ?? 0,
  };
}

async function ensureProductExists(productId: number) {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) throw httpError(404, 'NotFound', 'Product not found');
}

export async function hasDeliveredPurchaseForProduct(
  userId: number,
  productId: number
): Promise<boolean> {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(orderitems, eq(orderitems.orderId, orders.id))
    .where(
      and(
        eq(orders.userId, userId),
        eq(orders.status, 'delivered'),
        eq(orderitems.productId, productId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

export async function getStorefrontProductReviewsBySlug(
  slug: string
): Promise<ProductReviewsResponse> {
  const [product] = await db
    .select({ id: products.id, status: products.status })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (!product || product.status !== 'active') {
    throw httpError(404, 'NotFound', 'Product not found');
  }

  const rows = await db
    .select({
      id: productreviews.id,
      productId: productreviews.productId,
      userId: productreviews.userId,
      userName: users.fullName,
      verifiedPurchase: sql<number>`EXISTS(
        SELECT 1
        FROM orders o
        INNER JOIN orderitems oi ON oi.orderId = o.id
        WHERE o.userId = ${productreviews.userId}
          AND o.status = 'delivered'
          AND oi.productId = ${productreviews.productId}
        LIMIT 1
      )`,
      rating: productreviews.rating,
      comment: productreviews.comment,
      status: productreviews.status,
      editedAt: productreviews.editedAt,
      createdAt: productreviews.createdAt,
      updatedAt: productreviews.updatedAt,
    })
    .from(productreviews)
    .innerJoin(users, eq(users.id, productreviews.userId))
    .where(and(eq(productreviews.productId, product.id), eq(productreviews.status, 'approved')))
    .orderBy(desc(productreviews.createdAt));

  return {
    summary: buildSummary(rows),
    items: rows.map(toReviewResponse),
  };
}

export async function getMyProductReviewEligibility(
  userId: number,
  productId: number
): Promise<ProductReviewEligibilityResponse> {
  await ensureProductExists(productId);

  const [activeReviewRow] = await db
    .select({
      id: productreviews.id,
      productId: productreviews.productId,
      userId: productreviews.userId,
      userName: users.fullName,
      verifiedPurchase: sql<number>`EXISTS(
        SELECT 1
        FROM orders o
        INNER JOIN orderitems oi ON oi.orderId = o.id
        WHERE o.userId = ${productreviews.userId}
          AND o.status = 'delivered'
          AND oi.productId = ${productreviews.productId}
        LIMIT 1
      )`,
      rating: productreviews.rating,
      comment: productreviews.comment,
      status: productreviews.status,
      editedAt: productreviews.editedAt,
      createdAt: productreviews.createdAt,
      updatedAt: productreviews.updatedAt,
    })
    .from(productreviews)
    .innerJoin(users, eq(users.id, productreviews.userId))
    .where(
      and(
        eq(productreviews.userId, userId),
        eq(productreviews.productId, productId),
        ne(productreviews.status, 'deleted_by_user')
      )
    )
    .orderBy(desc(productreviews.createdAt), desc(productreviews.id))
    .limit(1);

  const myReview = activeReviewRow ? toReviewResponse(activeReviewRow) : null;
  if (myReview) {
    return {
      canSubmit: false,
      reason: 'already_reviewed',
      myReview,
    };
  }

  const delivered = await hasDeliveredPurchaseForProduct(userId, productId);
  if (!delivered) {
    return {
      canSubmit: false,
      reason: 'not_delivered_purchase',
      myReview,
    };
  }

  return {
    canSubmit: true,
    reason: 'ok',
    myReview,
  };
}

export async function getMyProductReviewById(userId: number, reviewId: number) {
  const [row] = await db
    .select({
      id: productreviews.id,
      productId: productreviews.productId,
      userId: productreviews.userId,
      userName: users.fullName,
      verifiedPurchase: sql<number>`EXISTS(
        SELECT 1
        FROM orders o
        INNER JOIN orderitems oi ON oi.orderId = o.id
        WHERE o.userId = ${productreviews.userId}
          AND o.status = 'delivered'
          AND oi.productId = ${productreviews.productId}
        LIMIT 1
      )`,
      rating: productreviews.rating,
      comment: productreviews.comment,
      status: productreviews.status,
      editedAt: productreviews.editedAt,
      createdAt: productreviews.createdAt,
      updatedAt: productreviews.updatedAt,
    })
    .from(productreviews)
    .innerJoin(users, eq(users.id, productreviews.userId))
    .where(and(eq(productreviews.id, reviewId), eq(productreviews.userId, userId)))
    .limit(1);

  if (!row) throw httpError(404, 'NotFound', 'Review not found');
  return toReviewResponse(row);
}

export async function listAdminReviews(
  query: AdminReviewsListQueryDto
): Promise<AdminReviewsListResponse> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const offset = (page - 1) * limit;
  const search = query.search?.trim();
  const filterMode = query.filterMode ?? 'all';
  const searchFilter = search
    ? or(like(products.name, `%${search}%`), like(users.fullName, `%${search}%`))
    : undefined;
  const optionalFilters = [
    query.status ? eq(productreviews.status, query.status) : undefined,
    query.ratingMin ? gte(productreviews.rating, query.ratingMin) : undefined,
    query.productId ? eq(productreviews.productId, query.productId) : undefined,
    query.suspiciousOnly ? eq(productreviews.isSuspicious, 1) : undefined,
    query.changes === 'edited'
      ? isNotNull(productreviews.editedAt)
      : query.changes === 'never_edited'
        ? isNull(productreviews.editedAt)
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
  const sortColumn =
    sortBy === 'productName'
      ? products.name
      : sortBy === 'userName'
        ? users.fullName
        : sortBy === 'rating'
          ? productreviews.rating
          : sortBy === 'status'
            ? productreviews.status
            : sortBy === 'updatedAt'
              ? productreviews.updatedAt
              : productreviews.createdAt;
  const orderByClause =
    sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: productreviews.id,
        productId: productreviews.productId,
        userId: productreviews.userId,
        userName: users.fullName,
        verifiedPurchase: sql<number>`EXISTS(
          SELECT 1
          FROM orders o
          INNER JOIN orderitems oi ON oi.orderId = o.id
          WHERE o.userId = ${productreviews.userId}
            AND o.status = 'delivered'
            AND oi.productId = ${productreviews.productId}
          LIMIT 1
        )`,
        rating: productreviews.rating,
        previousRating: productreviews.previousRating,
        comment: productreviews.comment,
        previousComment: productreviews.previousComment,
        status: productreviews.status,
        moderationNote: productreviews.moderationNote,
        isSuspicious: productreviews.isSuspicious,
        suspiciousScore: productreviews.suspiciousScore,
        suspiciousReasonsJson: productreviews.suspiciousReasonsJson,
        suspiciousFlaggedAt: productreviews.suspiciousFlaggedAt,
        editedAt: productreviews.editedAt,
        createdAt: productreviews.createdAt,
        updatedAt: productreviews.updatedAt,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(productreviews)
      .innerJoin(products, eq(products.id, productreviews.productId))
      .innerJoin(users, eq(users.id, productreviews.userId))
      .where(where)
      .orderBy(orderByClause, desc(productreviews.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(productreviews)
      .innerJoin(products, eq(products.id, productreviews.productId))
      .innerJoin(users, eq(users.id, productreviews.userId))
      .where(where),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    items: rows.map((row) => ({
      ...toReviewResponse(row),
      productName: row.productName,
      productSlug: row.productSlug,
      moderationNote: row.moderationNote ?? null,
      previousRating: row.previousRating ?? null,
      previousComment: row.previousComment ?? null,
      editedAt: toIsoOrNull(row.editedAt),
      isSuspicious: Number(row.isSuspicious) === 1,
      suspiciousScore: Number(row.suspiciousScore ?? 0),
      suspiciousReasons: parseSuspiciousReasons(row.suspiciousReasonsJson),
      suspiciousFlaggedAt: toIsoOrNull(row.suspiciousFlaggedAt),
    })),
    totalCount,
    total: totalCount,
    page,
    limit,
    totalPages,
  };
}

export async function getAdminReviewById(reviewId: number) {
  const [row] = await db
    .select({
      id: productreviews.id,
      productId: productreviews.productId,
      userId: productreviews.userId,
      userName: users.fullName,
      verifiedPurchase: sql<number>`EXISTS(
        SELECT 1
        FROM orders o
        INNER JOIN orderitems oi ON oi.orderId = o.id
        WHERE o.userId = ${productreviews.userId}
          AND o.status = 'delivered'
          AND oi.productId = ${productreviews.productId}
        LIMIT 1
      )`,
      rating: productreviews.rating,
      previousRating: productreviews.previousRating,
      comment: productreviews.comment,
      previousComment: productreviews.previousComment,
      status: productreviews.status,
      moderationNote: productreviews.moderationNote,
      isSuspicious: productreviews.isSuspicious,
      suspiciousScore: productreviews.suspiciousScore,
      suspiciousReasonsJson: productreviews.suspiciousReasonsJson,
      suspiciousFlaggedAt: productreviews.suspiciousFlaggedAt,
      editedAt: productreviews.editedAt,
      createdAt: productreviews.createdAt,
      updatedAt: productreviews.updatedAt,
      productName: products.name,
      productSlug: products.slug,
    })
    .from(productreviews)
    .innerJoin(products, eq(products.id, productreviews.productId))
    .innerJoin(users, eq(users.id, productreviews.userId))
    .where(eq(productreviews.id, reviewId))
    .limit(1);

  if (!row) throw httpError(404, 'NotFound', 'Review not found');
  return {
    ...toReviewResponse(row),
    productName: row.productName,
    productSlug: row.productSlug,
    moderationNote: row.moderationNote ?? null,
    previousRating: row.previousRating ?? null,
    previousComment: row.previousComment ?? null,
    editedAt: toIsoOrNull(row.editedAt),
    isSuspicious: Number(row.isSuspicious) === 1,
    suspiciousScore: Number(row.suspiciousScore ?? 0),
    suspiciousReasons: parseSuspiciousReasons(row.suspiciousReasonsJson),
    suspiciousFlaggedAt: toIsoOrNull(row.suspiciousFlaggedAt),
  };
}

export async function listMyReviews(userId: number): Promise<ProductReviewItemResponse[]> {
  const rows = await db
    .select({
      id: productreviews.id,
      productId: productreviews.productId,
      userId: productreviews.userId,
      userName: users.fullName,
      verifiedPurchase: sql<number>`EXISTS(
        SELECT 1
        FROM orders o
        INNER JOIN orderitems oi ON oi.orderId = o.id
        WHERE o.userId = ${productreviews.userId}
          AND o.status = 'delivered'
          AND oi.productId = ${productreviews.productId}
        LIMIT 1
      )`,
      rating: productreviews.rating,
      comment: productreviews.comment,
      status: productreviews.status,
      editedAt: productreviews.editedAt,
      createdAt: productreviews.createdAt,
      updatedAt: productreviews.updatedAt,
    })
    .from(productreviews)
    .innerJoin(users, eq(users.id, productreviews.userId))
    .where(eq(productreviews.userId, userId))
    .orderBy(desc(productreviews.createdAt), asc(productreviews.id));

  return rows.map(toReviewResponse);
}
