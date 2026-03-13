import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import * as reviewsApi from '@/lib/reviews';
import type { SubmitProductReviewDto, UpdateProductReviewDto } from '@/types';

type ApiValidationTree = {
  errors?: string[];
  properties?: Record<string, ApiValidationTree>;
  items?: ApiValidationTree[];
};

type ApiLikeError = Error & {
  code?: string;
  details?: ApiValidationTree;
};

function extractValidationMessage(node?: ApiValidationTree): string | null {
  if (!node) return null;
  if (Array.isArray(node.errors) && node.errors.length > 0) return node.errors[0] ?? null;

  if (node.properties) {
    for (const child of Object.values(node.properties)) {
      const message = extractValidationMessage(child);
      if (message) return message;
    }
  }

  if (Array.isArray(node.items)) {
    for (const child of node.items) {
      const message = extractValidationMessage(child);
      if (message) return message;
    }
  }

  return null;
}

function getReviewErrorMessage(err: ApiLikeError, fallback: string): string {
  const validationMessage = extractValidationMessage(err.details);
  if (validationMessage) return validationMessage;
  if (err.code === 'ValidationError') return 'Please check your review and try again.';
  return err.message || fallback;
}

export const reviewKeys = {
  all: ['reviews'] as const,
  storefrontBySlug: (slug: string) => [...reviewKeys.all, 'storefront', slug] as const,
  eligibilityByProductId: (productId: number) =>
    [...reviewKeys.all, 'eligibility', productId] as const,
};

export function useStorefrontProductReviews(slug: string) {
  return useQuery({
    queryKey: reviewKeys.storefrontBySlug(slug),
    queryFn: () => reviewsApi.fetchStorefrontProductReviewsBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useMyReviewEligibility(productId: number, enabled: boolean) {
  return useQuery({
    queryKey: reviewKeys.eligibilityByProductId(productId),
    queryFn: () => reviewsApi.fetchMyReviewEligibility(productId),
    enabled: enabled && Number.isFinite(productId),
  });
}

export function useSubmitMyReview(productId: number, slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitProductReviewDto) => reviewsApi.submitMyReview(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: reviewKeys.eligibilityByProductId(productId),
      });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.storefrontBySlug(slug) });
      toast.success('Review submitted');
    },
    onError: (err: ApiLikeError) => {
      toast.error(getReviewErrorMessage(err, 'Failed to submit review'));
    },
  });
}

export function useUpdateMyReview(productId: number, slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, payload }: { reviewId: number; payload: UpdateProductReviewDto }) =>
      reviewsApi.updateMyReview(reviewId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: reviewKeys.eligibilityByProductId(productId),
      });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.storefrontBySlug(slug) });
      toast.success('Review updated');
    },
    onError: (err: ApiLikeError) => {
      toast.error(getReviewErrorMessage(err, 'Failed to update review'));
    },
  });
}

export function useDeleteMyReview(productId: number, slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: number) => reviewsApi.deleteMyReview(reviewId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: reviewKeys.eligibilityByProductId(productId),
      });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.storefrontBySlug(slug) });
      toast.success('Review deleted');
    },
    onError: (err: ApiLikeError) => {
      toast.error(getReviewErrorMessage(err, 'Failed to delete review'));
    },
  });
}
