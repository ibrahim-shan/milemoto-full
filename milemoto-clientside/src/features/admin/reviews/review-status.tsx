import type { ProductReviewItemResponse } from '@/types';
import { StatusBadge } from '@/ui/status-badge';

type ReviewStatus = ProductReviewItemResponse['status'];

export function formatReviewStatus(status: ReviewStatus) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'deleted_by_user':
      return 'Deleted By User';
    default:
      return status;
  }
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const variant =
    status === 'approved'
      ? 'success'
      : status === 'pending'
        ? 'warning'
        : status === 'rejected'
          ? 'error'
          : 'neutral';

  return <StatusBadge variant={variant}>{formatReviewStatus(status)}</StatusBadge>;
}

export function ReviewPendingContextBadge({
  status,
  editedAt,
}: {
  status: ReviewStatus;
  editedAt: string | null;
}) {
  if (status !== 'pending' || !editedAt) return null;
  return <StatusBadge variant="info">Updated • Pending Re-approval</StatusBadge>;
}
