'use client';

import { useMemo, useState } from 'react';

import { CheckCircle2, Star } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import {
  useDeleteMyReview,
  useMyReviewEligibility,
  useStorefrontProductReviews,
  useSubmitMyReview,
  useUpdateMyReview,
} from '@/hooks/useReviewQueries';
import type { ProductReviewItemResponse } from '@/types';
import { Avatar, AvatarFallback } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Textarea } from '@/ui/textarea';

type ApiValidationTree = {
  errors?: string[];
  properties?: Record<string, ApiValidationTree>;
  items?: ApiValidationTree[];
};

type ApiLikeError = Error & {
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

type ReviewItem = {
  id: number;
  authorName: string;
  verifiedPurchase: boolean;
  rating: number;
  comment: string;
  createdAt: string;
  editedAt: string | null;
  isOwn?: boolean;
  status?: ProductReviewItemResponse['status'];
};

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, idx) => (
        <Star
          key={idx}
          className={`h-4 w-4 ${idx < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.slice(0, 1).toUpperCase();
  const second = parts[1] ?? '';
  return `${first.slice(0, 1)}${second.slice(0, 1)}`.toUpperCase();
}

function statusHint(status: ProductReviewItemResponse['status'] | undefined): string | null {
  if (status === 'pending') return 'Pending admin approval';
  if (status === 'rejected') return 'Rejected by admin';
  return null;
}

export function ProductReviewsSection({
  productName,
  productSlug,
  productId,
}: {
  productName: string;
  productSlug: string;
  productId: number;
}) {
  const { loading: authLoading, isAuthenticated, user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [reviewSort, setReviewSort] = useState<'newest' | 'rating_desc' | 'rating_asc'>('newest');

  const reviewsQuery = useStorefrontProductReviews(productSlug);
  const eligibilityQuery = useMyReviewEligibility(productId, !authLoading && isAuthenticated);

  const submitMutation = useSubmitMyReview(productId, productSlug);
  const updateMutation = useUpdateMyReview(productId, productSlug);
  const deleteMutation = useDeleteMyReview(productId, productSlug);
  const isSubmitting = submitMutation.isPending || updateMutation.isPending;

  const myReview = eligibilityQuery.data?.myReview ?? null;
  const canSubmit = eligibilityQuery.data?.canSubmit ?? false;
  const eligibilityReason = eligibilityQuery.data?.reason;

  const visibleReviews = useMemo(() => {
    const fromPublic: ReviewItem[] = (reviewsQuery.data?.items ?? []).map(item => ({
      id: item.id,
      authorName: item.userName,
      verifiedPurchase: item.verifiedPurchase,
      rating: item.rating,
      comment: item.comment,
      createdAt: item.createdAt,
      editedAt: item.editedAt,
      isOwn: user?.id === item.userId,
      status: item.status,
    }));

    if (!myReview || myReview.status === 'deleted_by_user') {
      return fromPublic;
    }

    const existsInPublic = fromPublic.some(item => item.id === myReview.id);
    if (existsInPublic) {
      return fromPublic.map(item =>
        item.id === myReview.id ? { ...item, isOwn: true, status: myReview.status } : item,
      );
    }

    return [
      {
        id: myReview.id,
        authorName: myReview.userName,
        verifiedPurchase: myReview.verifiedPurchase,
        rating: myReview.rating,
        comment: myReview.comment,
        createdAt: myReview.updatedAt || myReview.createdAt,
        editedAt: myReview.editedAt,
        isOwn: true,
        status: myReview.status,
      },
      ...fromPublic,
    ];
  }, [myReview, reviewsQuery.data?.items, user?.id]);

  const summary = reviewsQuery.data?.summary;
  const averageRating = summary?.averageRating ?? 0;
  const reviewsCount = summary?.totalReviews ?? 0;

  const sortedReviews = useMemo(() => {
    const items = [...visibleReviews];
    if (reviewSort === 'rating_desc') {
      items.sort((a, b) => b.rating - a.rating);
      return items;
    }
    if (reviewSort === 'rating_asc') {
      items.sort((a, b) => a.rating - b.rating);
      return items;
    }
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }, [reviewSort, visibleReviews]);

  const startEdit = (review: ReviewItem) => {
    if (review.status === 'rejected' || review.editedAt) {
      toast.error(
        review.status === 'rejected'
          ? 'Rejected review cannot be edited.'
          : 'You can update your review only once.',
      );
      return;
    }
    setEditingReviewId(review.id);
    setRating(review.rating);
    setComment(review.comment);
    setFormError(null);
  };

  const cancelEdit = () => {
    setEditingReviewId(null);
    setRating(5);
    setComment('');
    setFormError(null);
  };

  const deleteOwnReview = (id: number) => {
    void deleteMutation.mutateAsync(id).then(() => {
      if (editingReviewId === id) cancelEdit();
    });
  };

  const submitReview = async () => {
    const trimmedComment = comment.trim();
    if (!isAuthenticated) return;
    if (!trimmedComment) {
      setFormError('Please write your review first.');
      toast.error('Please write your review first.');
      return;
    }
    if (trimmedComment.length < 5) {
      setFormError('Comment must be at least 5 characters.');
      toast.error('Comment must be at least 5 characters.');
      return;
    }

    setFormError(null);

    try {
      if (editingReviewId) {
        await updateMutation.mutateAsync({
          reviewId: editingReviewId,
          payload: { rating, comment: trimmedComment },
        });
      } else {
        await submitMutation.mutateAsync({
          productId,
          rating,
          comment: trimmedComment,
        });
      }
    } catch (e) {
      const message =
        extractValidationMessage((e as ApiLikeError)?.details) ||
        'Failed to save review. Please try again.';
      setFormError(message);
      return;
    }

    setComment('');
    setRating(5);
    setEditingReviewId(null);
    setFormError(null);
  };

  const canEditOwnReview = (item: ReviewItem) =>
    item.isOwn && item.status !== 'deleted_by_user' && item.status !== 'rejected' && !item.editedAt;

  return (
    <section className="mt-8 space-y-6">
      <article className="border-border/60 bg-card rounded-xl border p-6">
        <h3 className="text-base font-semibold">Customer Reviews</h3>
        <div className="mt-3 flex items-center gap-3">
          {renderStars(Math.round(averageRating))}
          <p className="text-sm font-medium">
            {averageRating.toFixed(1)} out of 5
            <span className="text-muted-foreground ml-2">({reviewsCount} reviews)</span>
          </p>
        </div>
      </article>

      <article className="border-border/60 bg-card rounded-xl border p-6">
        <h3 className="text-base font-semibold">Write a Review</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Share your experience about {productName}.
        </p>

        {authLoading ||
        reviewsQuery.isLoading ||
        (isAuthenticated && eligibilityQuery.isLoading) ? (
          <p className="text-muted-foreground mt-4 text-sm">Loading...</p>
        ) : !isAuthenticated ? (
          <div className="mt-4 rounded-lg border border-dashed p-4">
            <p className="text-sm">You must be signed in to write a review.</p>
            <Button
              href={`/signin?next=/product/${productSlug}`}
              variant="outline"
              size="sm"
              className="mt-3 w-fit"
            >
              Sign In to Review
            </Button>
          </div>
        ) : !editingReviewId && !canSubmit ? (
          <div className="mt-4 rounded-lg border border-dashed p-4">
            {eligibilityReason === 'not_delivered_purchase' ? (
              <p className="text-sm">
                Only customers with a delivered order for this product can submit a review.
              </p>
            ) : myReview?.status === 'rejected' ? (
              <p className="text-sm">
                Your review was rejected by admin. You can keep it or delete it, but you cannot edit
                or submit a new one.
              </p>
            ) : myReview?.editedAt ? (
              <p className="text-sm">
                You already used your one allowed review edit. You can delete your review if needed.
              </p>
            ) : (
              <p className="text-sm">
                You already submitted your review for this product. You can edit or delete it below.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Your Rating</p>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const value = idx + 1;
                  const active = value <= rating;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="rounded p-1"
                      aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`h-5 w-5 ${active ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`}
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Your Review</p>
              <Textarea
                value={comment}
                onChange={event => {
                  setComment(event.target.value);
                  if (formError) setFormError(null);
                }}
                rows={4}
                placeholder="Write your review here..."
              />
              {formError ? (
                <p className="text-destructive mt-2 text-xs">{formError}</p>
              ) : (
                <p className="text-muted-foreground mt-2 text-xs">Minimum 5 characters.</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="solid"
                size="sm"
                onClick={submitReview}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : editingReviewId ? 'Update Review' : 'Submit Review'}
              </Button>
              {editingReviewId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelEdit}
                  disabled={isSubmitting}
                >
                  Cancel Edit
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </article>

      <article className="border-border/60 bg-card rounded-xl border p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-base font-semibold">All Reviews</h3>
          <div className="w-full md:w-56">
            <Select
              value={reviewSort}
              onValueChange={value => setReviewSort(value as typeof reviewSort)}
            >
              <SelectTrigger aria-label="Sort reviews">
                <SelectValue placeholder="Sort reviews" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="rating_desc">Highest rating</SelectItem>
                <SelectItem value="rating_asc">Lowest rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {sortedReviews.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">No reviews yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {sortedReviews.map(item => (
              <div
                key={item.id}
                className="border-border/60 border-b pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs font-semibold">
                        {initials(item.authorName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{item.authorName}</p>
                        {item.verifiedPurchase ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2
                              className="h-3.5 w-3.5"
                              aria-hidden
                            />
                            Verified buyer
                          </span>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground text-xs">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                  {renderStars(item.rating)}
                </div>
                {item.isOwn && statusHint(item.status) ? (
                  <p className="text-muted-foreground mt-1 pl-11 text-xs">
                    {statusHint(item.status)}
                  </p>
                ) : null}
                <p className="mt-2 pl-11 text-sm leading-6">{item.comment}</p>
                {item.isOwn && item.status !== 'deleted_by_user' ? (
                  <div className="mt-2 flex items-center justify-end gap-2 pl-11">
                    {canEditOwnReview(item) ? (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => startEdit(item)}
                      >
                        Edit
                      </Button>
                    ) : null}
                    <Button
                      variant="destructive"
                      size="xs"
                      onClick={() => deleteOwnReview(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

export default ProductReviewsSection;
