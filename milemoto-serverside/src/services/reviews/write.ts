import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { productreviews, products, users } from '@milemoto/types';
import type {
  AdminModerateReviewDto,
  SubmitProductReviewDto,
  UpdateProductReviewDto,
} from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { env } from '../../config/env.js';
import { httpError } from '../../utils/error.js';
import {
  getAdminReviewById,
  getMyProductReviewById,
  getMyProductReviewEligibility,
} from './read.js';

async function ensureProductActive(productId: number) {
  const [product] = await db
    .select({ id: products.id, status: products.status })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) throw httpError(404, 'NotFound', 'Product not found');
  if (product.status !== 'active') {
    throw httpError(400, 'ProductUnavailable', 'Product is not available');
  }
}

const LINK_REGEX = /(https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,}(\/|$))/i;
const REPEATED_CHARS_REGEX = /(.)\1{6,}/;
const TOO_MANY_PUNCTUATION_REGEX = /[!?.,;:()[\]{}\-_=+*#@%&]{8,}/;

function parseBlockedWords(): string[] {
  return env.REVIEW_BLOCKED_WORDS.split(',')
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);
}

function hasBlockedWord(comment: string, blockedWords: string[]): boolean {
  if (blockedWords.length === 0) return false;
  const lower = comment.toLowerCase();
  return blockedWords.some((word) => lower.includes(word));
}

function isLowQualityComment(comment: string): boolean {
  const cleaned = comment.trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (cleaned.length < 12) return true;
  if (words.length < 3) return true;

  // Low information text, e.g. "good good good" or too repetitive.
  const uniqueWords = new Set(words.map((word) => word.toLowerCase())).size;
  const uniqueRatio = uniqueWords / words.length;
  if (uniqueRatio < 0.5) return true;

  return false;
}

function evaluateReviewRisk(rawComment: string): {
  isSuspicious: boolean;
  suspiciousScore: number;
  suspiciousReasons: string[];
} {
  const comment = rawComment.trim();
  const blockedWords = parseBlockedWords();
  const suspiciousReasons: string[] = [];
  let suspiciousScore = 0;

  if (LINK_REGEX.test(comment)) {
    throw httpError(400, 'ReviewSpamDetected', 'Links are not allowed in reviews.');
  }
  if (REPEATED_CHARS_REGEX.test(comment)) {
    suspiciousReasons.push('repeated_characters');
    suspiciousScore += 2;
  }
  if (hasBlockedWord(comment, blockedWords)) {
    throw httpError(400, 'ReviewSpamDetected', 'Review contains blocked words.');
  }
  if (isLowQualityComment(comment)) {
    suspiciousReasons.push('low_quality_text');
    suspiciousScore += 2;
  }

  if (TOO_MANY_PUNCTUATION_REGEX.test(comment)) {
    suspiciousReasons.push('excessive_punctuation');
    suspiciousScore += 1;
  }

  return {
    isSuspicious: suspiciousScore > 0,
    suspiciousScore,
    suspiciousReasons,
  };
}

async function ensureFirstReviewAccountAge(userId: number) {
  if (env.REVIEW_MIN_ACCOUNT_AGE_HOURS <= 0) return;

  const [existingReview] = await db
    .select({ id: productreviews.id })
    .from(productreviews)
    .where(eq(productreviews.userId, userId))
    .limit(1);

  // Gate applies only before first-ever review.
  if (existingReview) return;

  const [user] = await db
    .select({ id: users.id, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.createdAt) {
    throw httpError(400, 'BadRequest', 'Unable to verify account age for review submission');
  }

  const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
  const requiredMs = env.REVIEW_MIN_ACCOUNT_AGE_HOURS * 60 * 60 * 1000;
  if (accountAgeMs >= requiredMs) return;

  const remainingHours = Math.ceil((requiredMs - accountAgeMs) / (60 * 60 * 1000));
  throw httpError(
    403,
    'ReviewAccountTooNew',
    `Account must be at least ${env.REVIEW_MIN_ACCOUNT_AGE_HOURS} hour(s) old before first review. Try again in about ${remainingHours} hour(s).`
  );
}

export async function submitProductReview(userId: number, input: SubmitProductReviewDto) {
  await ensureProductActive(input.productId);
  await ensureFirstReviewAccountAge(userId);
  const risk = evaluateReviewRisk(input.comment);

  const eligibility = await getMyProductReviewEligibility(userId, input.productId);
  if (!eligibility.canSubmit) {
    if (eligibility.reason === 'already_reviewed') {
      throw httpError(409, 'ReviewExists', 'You already submitted a review for this product');
    }
    throw httpError(
      400,
      'ReviewNotAllowed',
      'Only customers with a delivered order for this product can review'
    );
  }

  await db.insert(productreviews).values({
    productId: input.productId,
    userId,
    rating: input.rating,
    comment: input.comment.trim(),
    status: 'pending',
    moderationNote: null,
    isSuspicious: risk.isSuspicious ? 1 : 0,
    suspiciousScore: risk.suspiciousScore,
    suspiciousReasonsJson:
      risk.suspiciousReasons.length > 0 ? JSON.stringify(risk.suspiciousReasons) : null,
    suspiciousFlaggedAt: risk.isSuspicious ? sql`CURRENT_TIMESTAMP` : null,
  });

  // Avoid driver-specific insert metadata differences; read back the row by the unique key.
  const [created] = await db
    .select({ id: productreviews.id })
    .from(productreviews)
    .where(and(eq(productreviews.userId, userId), eq(productreviews.productId, input.productId)))
    .orderBy(desc(productreviews.id))
    .limit(1);

  if (!created?.id) {
    throw httpError(500, 'InternalError', 'Failed to create review');
  }
  return getMyProductReviewById(userId, Number(created.id));
}

export async function updateMyProductReview(
  userId: number,
  reviewId: number,
  input: UpdateProductReviewDto
) {
  const review = await getMyProductReviewById(userId, reviewId);
  if (review.status === 'deleted_by_user') {
    throw httpError(400, 'BadRequest', 'Deleted review cannot be updated');
  }
  if (review.status === 'rejected') {
    throw httpError(400, 'ReviewLocked', 'Rejected review cannot be edited');
  }
  if (review.editedAt) {
    throw httpError(400, 'ReviewUpdateLimitReached', 'You can update your review only once');
  }
  const risk = evaluateReviewRisk(input.comment);

  await db
    .update(productreviews)
    .set({
      rating: input.rating,
      previousRating: review.rating,
      comment: input.comment.trim(),
      previousComment: review.comment,
      status: 'pending',
      moderationNote: null,
      isSuspicious: risk.isSuspicious ? 1 : 0,
      suspiciousScore: risk.suspiciousScore,
      suspiciousReasonsJson:
        risk.suspiciousReasons.length > 0 ? JSON.stringify(risk.suspiciousReasons) : null,
      suspiciousFlaggedAt: risk.isSuspicious ? sql`CURRENT_TIMESTAMP` : null,
      editedAt: sql`CURRENT_TIMESTAMP`,
      approvedAt: null,
      approvedByUserId: null,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(eq(productreviews.id, reviewId), eq(productreviews.userId, userId)));

  return getMyProductReviewById(userId, reviewId);
}

export async function deleteMyProductReview(userId: number, reviewId: number) {
  await getMyProductReviewById(userId, reviewId);

  await db
    .update(productreviews)
    .set({
      status: 'deleted_by_user',
      moderationNote: null,
      isSuspicious: 0,
      suspiciousScore: 0,
      suspiciousReasonsJson: null,
      suspiciousFlaggedAt: null,
      editedAt: null,
      approvedAt: null,
      approvedByUserId: null,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(eq(productreviews.id, reviewId), eq(productreviews.userId, userId)));
}

export async function moderateReview(
  reviewId: number,
  adminUserId: number,
  input: AdminModerateReviewDto
) {
  const review = await getAdminReviewById(reviewId);
  if (review.status === 'deleted_by_user') {
    throw httpError(400, 'ReviewDeletedByUser', 'Cannot moderate a review deleted by user');
  }

  await db
    .update(productreviews)
    .set({
      status: input.status,
      moderationNote: input.note?.trim() || null,
      approvedAt: input.status === 'approved' ? sql`CURRENT_TIMESTAMP` : null,
      approvedByUserId: input.status === 'approved' ? adminUserId : null,
      isSuspicious: 0,
      suspiciousScore: 0,
      suspiciousReasonsJson: null,
      suspiciousFlaggedAt: null,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(productreviews.id, reviewId));

  return getAdminReviewById(reviewId);
}

export async function deleteReviewAsAdmin(reviewId: number) {
  await getAdminReviewById(reviewId);
  await db.delete(productreviews).where(eq(productreviews.id, reviewId));
}

export async function bulkModerateReviews(
  reviewIds: number[],
  adminUserId: number,
  input: AdminModerateReviewDto
) {
  if (reviewIds.length === 0) {
    return {
      updated: 0,
      skipped: 0,
      reasons: [] as Array<{ reviewId: number; reason: 'not_found' | 'deleted_by_user' }>,
    };
  }

  const uniqueRequestedIds = Array.from(new Set(reviewIds));

  const rows = await db
    .select({ id: productreviews.id, status: productreviews.status })
    .from(productreviews)
    .where(inArray(productreviews.id, uniqueRequestedIds));

  const rowById = new Map(rows.map((r) => [Number(r.id), r]));
  const updatableIds: number[] = [];
  const reasons: Array<{ reviewId: number; reason: 'not_found' | 'deleted_by_user' }> = [];

  for (const reviewId of uniqueRequestedIds) {
    const row = rowById.get(reviewId);
    if (!row) {
      reasons.push({ reviewId, reason: 'not_found' });
      continue;
    }
    if (row.status === 'deleted_by_user') {
      reasons.push({ reviewId, reason: 'deleted_by_user' });
      continue;
    }
    updatableIds.push(reviewId);
  }

  if (updatableIds.length > 0) {
    await db
      .update(productreviews)
      .set({
        status: input.status,
        moderationNote: input.note?.trim() || null,
        approvedAt: input.status === 'approved' ? sql`CURRENT_TIMESTAMP` : null,
        approvedByUserId: input.status === 'approved' ? adminUserId : null,
        isSuspicious: 0,
        suspiciousScore: 0,
        suspiciousReasonsJson: null,
        suspiciousFlaggedAt: null,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(inArray(productreviews.id, updatableIds));
  }

  return {
    updated: updatableIds.length,
    skipped: reasons.length,
    reasons,
  };
}
