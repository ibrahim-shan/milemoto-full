'use client';

import { useEffect, useState } from 'react';

import { RejectReviewDialog } from './RejectReviewDialog';
import { ReviewPendingContextBadge, ReviewStatusBadge } from './review-status';
import { ArrowLeft, Check, Pencil, Send, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { deleteAdminReview, fetchAdminReviewById, moderateAdminReview } from '@/lib/admin-reviews';
import { cn } from '@/lib/utils';
import type { AdminReviewListItem } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui/alert-dialog';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { StatusBadge } from '@/ui/status-badge';

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
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
      <span className="text-muted-foreground ml-1 text-xs">{rating}/5</span>
    </div>
  );
}

type ReviewEvent = {
  key: string;
  label: string;
  at: string;
  tone?: 'default' | 'success' | 'danger' | 'muted';
};

function getReviewEvents(review: AdminReviewListItem): ReviewEvent[] {
  const events: ReviewEvent[] = [
    { key: 'submitted', label: 'Submitted', at: review.createdAt, tone: 'default' },
  ];

  if (review.editedAt) {
    events.push({ key: 'edited', label: 'Edited', at: review.editedAt, tone: 'default' });
  }

  if (review.status === 'approved') {
    // approvedAt is not present in this DTO, so we use updatedAt as the moderation event time.
    events.push({ key: 'approved', label: 'Approved', at: review.updatedAt, tone: 'success' });
  } else if (review.status === 'rejected') {
    events.push({ key: 'rejected', label: 'Rejected', at: review.updatedAt, tone: 'danger' });
  } else if (review.status === 'deleted_by_user') {
    events.push({
      key: 'deleted_by_user',
      label: 'Deleted by user',
      at: review.updatedAt,
      tone: 'muted',
    });
  }

  return events
    .filter(event => !Number.isNaN(new Date(event.at).getTime()))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function EventIcon({ label }: { label: string }) {
  if (label === 'Submitted')
    return (
      <Send
        className="h-4 w-4"
        aria-hidden
      />
    );
  if (label === 'Edited')
    return (
      <Pencil
        className="h-4 w-4"
        aria-hidden
      />
    );
  if (label === 'Approved')
    return (
      <Check
        className="h-4 w-4"
        aria-hidden
      />
    );
  if (label === 'Rejected')
    return (
      <X
        className="h-4 w-4"
        aria-hidden
      />
    );
  return (
    <Trash2
      className="h-4 w-4"
      aria-hidden
    />
  );
}

function suspiciousVariant(score: number): 'info' | 'warning' | 'error' {
  if (score >= 4) return 'error';
  if (score >= 2) return 'warning';
  return 'info';
}

export function AdminReviewDetailClient({ reviewId }: { reviewId: number }) {
  const [review, setReview] = useState<AdminReviewListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | 'delete' | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [moderationNote, setModerationNote] = useState('');
  const moderationLocked = review?.status === 'deleted_by_user';

  const load = () => {
    setLoading(true);
    setError(null);
    fetchAdminReviewById(reviewId)
      .then(data => {
        setReview(data);
        setModerationNote(data.moderationNote ?? '');
      })
      .catch(err => setError((err as { message?: string })?.message || 'Failed to load review'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load helper is stable enough here
  }, [reviewId]);

  const moderate = async (status: 'approved' | 'rejected') => {
    if (!review) return false;
    try {
      setActionLoading(status === 'approved' ? 'approve' : 'reject');
      const updated = await moderateAdminReview(review.id, {
        status,
        note: moderationNote.trim() || undefined,
      });
      setReview(updated);
      setModerationNote(updated.moderationNote ?? '');
      toast.success(status === 'approved' ? 'Review approved' : 'Review rejected');
      return true;
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to update review');
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const remove = async () => {
    if (!review) return;
    try {
      setActionLoading('delete');
      await deleteAdminReview(review.id);
      toast.success('Review deleted');
      window.location.href = '/admin/reviews';
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete review');
      setActionLoading(null);
      setDeleteOpen(false);
    }
  };

  const rejectWithNote = async () => {
    if (!moderationNote.trim()) {
      toast.error('Moderation note is required when rejecting a review');
      return;
    }
    const ok = await moderate('rejected');
    if (ok) setRejectOpen(false);
  };

  return (
    <PermissionGuard requiredPermission="reviews.read">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            href="/admin/reviews"
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Reviews
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Review Details</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading review...</p>
            ) : error || !review ? (
              <p className="text-sm text-red-600">{error || 'Review not found'}</p>
            ) : (
              <div className="space-y-6">
                <section className="rounded-md border p-4">
                  <div className="text-muted-foreground text-xs font-semibold uppercase">
                    Review Timeline
                  </div>
                  <div className="mt-3 space-y-3">
                    {getReviewEvents(review).map(event => (
                      <div
                        key={event.key}
                        className="flex items-start gap-3"
                      >
                        <div
                          className={cn(
                            'mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border',
                            event.tone === 'success'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : event.tone === 'danger'
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : event.tone === 'muted'
                                  ? 'border-neutral-200 bg-neutral-50 text-neutral-700'
                                  : 'border-sky-200 bg-sky-50 text-sky-700',
                          )}
                        >
                          <EventIcon label={event.label} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{event.label}</p>
                          <p className="text-muted-foreground text-xs">
                            {formatDateTime(event.at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase">Status</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ReviewStatusBadge status={review.status} />
                      <ReviewPendingContextBadge
                        status={review.status}
                        editedAt={review.editedAt}
                      />
                      {review.isSuspicious ? (
                        <StatusBadge variant={suspiciousVariant(review.suspiciousScore)}>
                          Suspicious{' '}
                          {review.suspiciousScore > 0 ? `(score ${review.suspiciousScore})` : ''}
                        </StatusBadge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => void moderate('approved')}
                      disabled={
                        actionLoading !== null || review.status === 'approved' || moderationLocked
                      }
                    >
                      <Check className="mr-1.5 h-4 w-4" />
                      {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectOpen(true)}
                      disabled={
                        actionLoading !== null || review.status === 'rejected' || moderationLocked
                      }
                    >
                      <X className="mr-1.5 h-4 w-4" />
                      {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteOpen(true)}
                      disabled={actionLoading !== null}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Info
                    label="Review ID"
                    value={`#${review.id}`}
                  />
                  <Info
                    label="Product ID"
                    value={`#${review.productId}`}
                  />
                  <Info
                    label="Product"
                    value={review.productName}
                  />
                  <Info
                    label="Product Slug"
                    value={`/${review.productSlug}`}
                    mono
                  />
                  <Info
                    label="User ID"
                    value={`#${review.userId}`}
                  />
                  <Info
                    label="Author"
                    value={review.userName}
                  />
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase">Stars</div>
                    {renderStars(review.rating)}
                  </div>
                  <Info
                    label="Created"
                    value={formatDateTime(review.createdAt)}
                  />
                  <Info
                    label="Updated"
                    value={formatDateTime(review.updatedAt)}
                  />
                  {review.suspiciousFlaggedAt ? (
                    <Info
                      label="Suspicious Flagged At"
                      value={formatDateTime(review.suspiciousFlaggedAt)}
                    />
                  ) : null}
                </div>

                {review.suspiciousReasons.length > 0 ? (
                  <section className="rounded-md border p-4">
                    <div className="text-muted-foreground text-xs font-semibold uppercase">
                      Suspicion Signals
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {review.suspiciousReasons.map(reason => (
                        <StatusBadge
                          key={reason}
                          variant="warning"
                        >
                          {reason.replace(/_/g, ' ')}
                        </StatusBadge>
                      ))}
                    </div>
                  </section>
                ) : null}

                {!review.previousComment && review.previousRating === null ? (
                  <section className="rounded-md border p-4">
                    <div className="text-muted-foreground text-xs font-semibold uppercase">
                      Comment
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{review.comment}</p>
                  </section>
                ) : null}

                {review.previousComment || review.previousRating !== null ? (
                  <section className="rounded-md border p-4">
                    <div className="text-muted-foreground text-xs font-semibold uppercase">
                      Edit Comparison
                    </div>
                    {review.editedAt ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Last edited: {formatDateTime(review.editedAt)}
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      <div className="rounded-md border p-3">
                        <p className="text-muted-foreground text-xs font-semibold uppercase">
                          Previous Review
                        </p>
                        {review.previousRating !== null ? (
                          <div className="mt-2">{renderStars(review.previousRating)}</div>
                        ) : null}
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                          {review.previousComment || '-'}
                        </p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-muted-foreground text-xs font-semibold uppercase">
                          Current Review
                        </p>
                        <div className="mt-2">{renderStars(review.rating)}</div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                          {review.comment}
                        </p>
                      </div>
                    </div>
                  </section>
                ) : null}

                {review.moderationNote ? (
                  <section className="rounded-md border p-4">
                    <div className="text-muted-foreground text-xs font-semibold uppercase">
                      Moderation Note
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                      {review.moderationNote}
                    </p>
                  </section>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete review
              <span className="text-foreground font-semibold"> #{review?.id} </span>
              from the server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading === 'delete'}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={e => {
                e.preventDefault();
                void remove();
              }}
              disabled={actionLoading === 'delete'}
            >
              {actionLoading === 'delete' ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RejectReviewDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        subjectText={`review #${review?.id ?? ''}`}
        note={moderationNote}
        onNoteChange={setModerationNote}
        onConfirm={() => void rejectWithNote()}
        isSubmitting={actionLoading === 'reject'}
        noteInputId="reject-detail-review-note"
      />
    </PermissionGuard>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-xs uppercase">{label}</div>
      <div className={mono ? 'font-mono text-sm' : 'text-sm'}>{value}</div>
    </div>
  );
}

export default AdminReviewDetailClient;
