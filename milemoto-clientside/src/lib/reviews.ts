import { authorizedDel, authorizedGet, authorizedPatch, authorizedPost, get } from './api';

import type {
  ProductReviewEligibilityResponse,
  ProductReviewItemResponse,
  ProductReviewsResponse,
  SubmitProductReviewDto,
  UpdateProductReviewDto,
} from '@/types';

export function fetchStorefrontProductReviewsBySlug(slug: string): Promise<ProductReviewsResponse> {
  return get<ProductReviewsResponse>(`/storefront/products/${encodeURIComponent(slug)}/reviews`);
}

export function fetchMyReviewEligibility(
  productId: number,
): Promise<ProductReviewEligibilityResponse> {
  return authorizedGet<ProductReviewEligibilityResponse>(`/reviews/eligibility/${productId}`);
}

export function submitMyReview(
  payload: SubmitProductReviewDto,
): Promise<ProductReviewItemResponse> {
  return authorizedPost<ProductReviewItemResponse>('/reviews', payload);
}

export function updateMyReview(
  reviewId: number,
  payload: UpdateProductReviewDto,
): Promise<ProductReviewItemResponse> {
  return authorizedPatch<ProductReviewItemResponse>(`/reviews/${reviewId}`, payload);
}

export function deleteMyReview(reviewId: number): Promise<void> {
  return authorizedDel<void>(`/reviews/${reviewId}`);
}
