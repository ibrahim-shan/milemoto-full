'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { RejectReviewDialog } from './RejectReviewDialog';
import { ReviewFilters } from './review-filters';
import { ReviewPendingContextBadge, ReviewStatusBadge } from './review-status';
import { AlertTriangle, Check, Clock3, Eye, ListChecks, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import {
  bulkModerateAdminReviews,
  deleteAdminReview,
  fetchAdminReviews,
  moderateAdminReview,
} from '@/lib/admin-reviews';
import type { AdminReviewListItem, AdminReviewsListQueryDto, AdminReviewsListResponse } from '@/types';
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
import { Checkbox } from '@/ui/checkbox';
import { ColumnVisibilityMenu } from '@/ui/column-visibility-menu';
import { StatsCards } from '@/ui/stats-cards';
import { StatusBadge } from '@/ui/status-badge';
import { SortDirection, SortableTableHead } from '@/ui/sortable-table-head';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableActionsMenu } from '@/ui/table-actions-menu';
import { TablePaginationFooter } from '@/ui/table-pagination-footer';
import { TableStateMessage } from '@/ui/table-state-message';

type ReviewFilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'deleted_by_user';
type ReviewChangesFilter = 'all' | 'edited' | 'never_edited';

const REVIEW_COLUMNS = [
  { id: 'review', label: 'Review', alwaysVisible: true },
  { id: 'product', label: 'Product' },
  { id: 'author', label: 'Author' },
  { id: 'rating', label: 'Rating' },
  { id: 'status', label: 'Status' },
  { id: 'updated', label: 'Updated' },
  { id: 'actions', label: 'Actions', alwaysVisible: true },
] as const;

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function truncate(value: string, max = 120) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function suspiciousVariant(score: number): 'info' | 'warning' | 'error' {
  if (score >= 4) return 'error';
  if (score >= 2) return 'warning';
  return 'info';
}

function formatDurationFromMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0m';
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function AdminReviewsListClient() {
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput.trim());
  const [filters, setFilters] = useState<Record<string, string | number | boolean | string[] | undefined>>({
    filterMode: 'all',
    status: '',
    ratingMin: '',
    changes: '',
    suspiciousOnly: false,
    productId: '',
  });
  const deferredProductId = useDeferredValue(String(filters.productId ?? '').trim());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<
    'createdAt' | 'productName' | 'userName' | 'rating' | 'status' | 'updatedAt' | undefined
  >(undefined);
  const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
  const {
    visibility: columnVisibility,
    setVisibility: setColumnVisibility,
    isColumnVisible,
    visibleColumnCount,
  } = useColumnVisibility(REVIEW_COLUMNS, 'admin.reviews.columns');
  const [data, setData] = useState<AdminReviewsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminReviewListItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminReviewListItem | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkNote, setBulkNote] = useState('');
  const [lastBulkResult, setLastBulkResult] = useState<{
    action: 'approved' | 'rejected';
    updated: number;
    skipped: number;
    reasons: Array<{ reviewId: number; reason: 'not_found' | 'deleted_by_user' }>;
    at: string;
  } | null>(null);
  const status =
    typeof filters.status === 'string' && filters.status !== ''
      ? (filters.status as ReviewFilterStatus)
      : 'all';
  const changes =
    typeof filters.changes === 'string' && filters.changes !== ''
      ? (filters.changes as ReviewChangesFilter)
      : 'all';
  const suspiciousOnly = filters.suspiciousOnly === true;
  const filterMode: 'all' | 'any' =
    typeof filters.filterMode === 'string' && filters.filterMode === 'any' ? 'any' : 'all';

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, deferredProductId, status, filters.ratingMin, changes, suspiciousOnly, filterMode]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [
    deferredSearch,
    deferredProductId,
    status,
    filters.ratingMin,
    changes,
    suspiciousOnly,
    filterMode,
    page,
    pageSize,
  ]);

  const query = useMemo<Partial<AdminReviewsListQueryDto>>(
    () => ({
      page,
      limit: pageSize,
      search: deferredSearch || undefined,
      filterMode: filterMode === 'any' ? 'any' : undefined,
      status: status === 'all' ? undefined : status,
      ratingMin:
        typeof filters.ratingMin === 'string' && filters.ratingMin !== ''
          ? Number(filters.ratingMin)
          : typeof filters.ratingMin === 'number'
            ? filters.ratingMin
            : undefined,
      changes: changes === 'all' ? undefined : changes,
      suspiciousOnly: suspiciousOnly || undefined,
      productId:
        deferredProductId && Number.isFinite(Number(deferredProductId))
          ? Number(deferredProductId)
          : undefined,
      sortBy: sortBy || undefined,
      sortDir: sortBy && sortDir ? sortDir : undefined,
    }),
    [
      deferredProductId,
      deferredSearch,
      page,
      pageSize,
      filterMode,
      status,
      filters.ratingMin,
      changes,
      suspiciousOnly,
      sortBy,
      sortDir,
    ],
  );

  const handleSortChange = (nextSortBy?: string, nextSortDir?: SortDirection) => {
    setSortBy(nextSortBy as typeof sortBy);
    setSortDir(nextSortDir);
    setPage(1);
  };

  const load = () => {
    setLoading(true);
    setError(null);
    fetchAdminReviews(query)
      .then(result => setData(result))
      .catch(err => setError((err as { message?: string })?.message || 'Failed to load reviews'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAdminReviews(query)
      .then(result => {
        if (!cancelled) setData(result);
      })
      .catch(err => {
        if (!cancelled) {
          setError((err as { message?: string })?.message || 'Failed to load reviews');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const selectableIds = items
    .filter(item => item.status !== 'deleted_by_user')
    .map(item => item.id);
  const isAllSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.has(id));
  const selectedCount = selectedIds.size;
  const pendingInResults = items.filter(item => item.status === 'pending').length;
  const suspiciousInResults = items.filter(item => item.isSuspicious).length;
  const moderationDurations = items
    .filter(item => item.status === 'approved' || item.status === 'rejected')
    .map(item => new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime())
    .filter(ms => Number.isFinite(ms) && ms > 0);
  const avgModerationMs =
    moderationDurations.length > 0
      ? moderationDurations.reduce((acc, ms) => acc + ms, 0) / moderationDurations.length
      : 0;
  const statItems = [
    { label: 'Total Reviews', value: totalCount, icon: ListChecks },
    { label: 'Pending (in results)', value: pendingInResults, icon: Clock3 },
    { label: 'Suspicious (in results)', value: suspiciousInResults, icon: AlertTriangle },
    { label: 'Avg Moderation Time', value: formatDurationFromMs(avgModerationMs), icon: Check },
  ];

  const moderate = async (
    review: AdminReviewListItem,
    nextStatus: 'approved' | 'rejected',
    note?: string,
  ) => {
    try {
      setActionLoading(`${review.id}:${nextStatus}`);
      await moderateAdminReview(review.id, {
        status: nextStatus,
        note: note?.trim() || undefined,
      });
      toast.success(nextStatus === 'approved' ? 'Review approved' : 'Review rejected');
      load();
      return true;
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to update review');
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(selectableIds));
  };

  const toggleSelectOne = (reviewId: number, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(reviewId);
      else next.delete(reviewId);
      return next;
    });
  };

  const handleBulkModerate = async (targetStatus: 'approved' | 'rejected') => {
    if (selectedIds.size === 0) return;
    if (targetStatus === 'rejected' && !bulkNote.trim()) {
      toast.error('Moderation note is required when rejecting reviews');
      return;
    }
    try {
      setActionLoading(`bulk:${targetStatus}`);
      const reviewIds = Array.from(selectedIds);
      const result = await bulkModerateAdminReviews({
        reviewIds,
        status: targetStatus,
        ...(bulkNote.trim() ? { note: bulkNote.trim() } : {}),
      });
      const actionLabel = targetStatus === 'approved' ? 'Approved' : 'Rejected';
      if (result.skipped > 0) {
        const deletedCount = result.reasons.filter(r => r.reason === 'deleted_by_user').length;
        const notFoundCount = result.reasons.filter(r => r.reason === 'not_found').length;
        const reasonsText = [
          deletedCount > 0 ? `${deletedCount} deleted-by-user` : null,
          notFoundCount > 0 ? `${notFoundCount} not found` : null,
        ]
          .filter(Boolean)
          .join(', ');
        toast.warning(
          `${actionLabel} ${result.updated} review(s), skipped ${result.skipped}${reasonsText ? ` (${reasonsText})` : ''}.`,
        );
      } else {
        toast.success(`${actionLabel} ${result.updated} review(s)`);
      }
      setLastBulkResult({
        action: targetStatus,
        updated: result.updated,
        skipped: result.skipped,
        reasons: result.reasons,
        at: new Date().toISOString(),
      });
      setSelectedIds(new Set());
      if (targetStatus === 'rejected') setBulkNote('');
      load();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to bulk update reviews');
    } finally {
      setActionLoading(null);
    }
  };

  const openBulkRejectDialog = () => {
    if (selectedIds.size === 0) return;
    setBulkRejectOpen(true);
  };

  const confirmBulkReject = async () => {
    const note = bulkNote.trim();
    if (!note) {
      toast.error('Moderation note is required when rejecting reviews');
      return;
    }
    await handleBulkModerate('rejected');
    setBulkRejectOpen(false);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const note = rejectNote.trim();
    if (!note) {
      toast.error('Moderation note is required when rejecting a review');
      return;
    }
    const ok = await moderate(rejectTarget, 'rejected', note);
    if (ok) {
      setRejectTarget(null);
      setRejectNote('');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setActionLoading(`${deleteTarget.id}:delete`);
      await deleteAdminReview(deleteTarget.id);
      toast.success('Review deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete review');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <PermissionGuard requiredPermission="reviews.read">
      <Card>
        <CardHeader>
          <CardTitle>Product Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsCards data={statItems} />

          <div className="mb-4">
            <ReviewFilters
              filters={filters}
              onFilterChange={nextFilters => {
                const normalizedProductId =
                  typeof nextFilters.productId === 'string'
                    ? nextFilters.productId.replace(/[^\d]/g, '')
                    : '';
                setFilters({
                  ...nextFilters,
                  productId: normalizedProductId,
                });
                setPage(1);
              }}
              search={searchInput}
              onSearchChange={value => {
                setSearchInput(value);
                setPage(1);
              }}
              actions={
                <ColumnVisibilityMenu
                  columns={REVIEW_COLUMNS}
                  visibility={columnVisibility}
                  onToggle={(columnId, visible) =>
                    setColumnVisibility(prev => ({ ...prev, [columnId]: visible }))
                  }
                />
              }
            />
          </div>

          {selectedCount > 0 ? (
            <div className="mb-4 flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm font-medium">{selectedCount} selected</div>
              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                <Button
                  size="sm"
                  onClick={() => void handleBulkModerate('approved')}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'bulk:approved' ? 'Approving...' : 'Approve Selected'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openBulkRejectDialog}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'bulk:rejected' ? 'Rejecting...' : 'Reject Selected'}
                </Button>
              </div>
            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12.5">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={checked => toggleSelectAll(checked === true)}
                    aria-label="Select all reviews on this page"
                  />
                </TableHead>
                <TableHead>
                  <SortableTableHead
                    label="Review"
                    columnKey="createdAt"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSortChange={handleSortChange}
                  />
                </TableHead>
                {isColumnVisible('product') ? (
                  <TableHead>
                    <SortableTableHead
                      label="Product"
                      columnKey="productName"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                ) : null}
                {isColumnVisible('author') ? (
                  <TableHead>
                    <SortableTableHead
                      label="Author"
                      columnKey="userName"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                ) : null}
                {isColumnVisible('rating') ? (
                  <TableHead>
                    <SortableTableHead
                      label="Rating"
                      columnKey="rating"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                ) : null}
                {isColumnVisible('status') ? (
                  <TableHead>
                    <SortableTableHead
                      label="Status"
                      columnKey="status"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                ) : null}
                {isColumnVisible('updated') ? (
                  <TableHead>
                    <SortableTableHead
                      label="Updated"
                      columnKey="updatedAt"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                ) : null}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount + 1}
                    className="text-muted-foreground py-10 text-center text-sm"
                  >
                    Loading reviews...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount + 1}
                    className="py-10"
                  >
                    <TableStateMessage
                      variant="error"
                      message={error}
                      onRetry={load}
                    />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount + 1}
                    className="py-10"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No reviews found."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map(item => (
                  <AdminReviewsRow
                    key={item.id}
                    item={item}
                    isColumnVisible={isColumnVisible}
                    actionLoading={actionLoading}
                    isSelected={selectedIds.has(item.id)}
                    onToggleSelect={checked => toggleSelectOne(item.id, checked)}
                    onApprove={() => moderate(item, 'approved')}
                    onReject={() => {
                      setRejectTarget(item);
                      setRejectNote(item.moderationNote ?? '');
                    }}
                    onDelete={() => setDeleteTarget(item)}
                  />
                ))
              )}
            </TableBody>
          </Table>

          {lastBulkResult ? (
            <details className="mt-4 rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Last bulk result ({lastBulkResult.action === 'approved' ? 'Approve' : 'Reject'}):{' '}
                updated {lastBulkResult.updated}, skipped {lastBulkResult.skipped}
                <span className="text-muted-foreground ml-2 font-normal">
                  {formatDateTime(lastBulkResult.at)}
                </span>
              </summary>
              <div className="mt-3 space-y-2">
                {lastBulkResult.reasons.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No skipped reviews.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {lastBulkResult.reasons.map(item => (
                      <li
                        key={`${item.reviewId}:${item.reason}`}
                        className="flex items-center gap-2"
                      >
                        <span className="font-medium">#{item.reviewId}</span>
                        <span className="text-muted-foreground">
                          {item.reason === 'deleted_by_user' ? 'Deleted by user' : 'Not found'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          ) : null}

          <TablePaginationFooter
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete review
              <span className="text-foreground font-semibold"> #{deleteTarget?.id} </span>
              from the server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading?.endsWith(':delete')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={e => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={actionLoading?.endsWith(':delete')}
            >
              {actionLoading?.endsWith(':delete') ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RejectReviewDialog
        open={Boolean(rejectTarget)}
        onOpenChange={open => {
          if (!open) {
            setRejectTarget(null);
            setRejectNote('');
          }
        }}
        subjectText={`review #${rejectTarget?.id ?? ''}`}
        note={rejectNote}
        onNoteChange={setRejectNote}
        onConfirm={() => void confirmReject()}
        isSubmitting={actionLoading === `${rejectTarget?.id}:rejected`}
        noteInputId="reject-single-review-note"
      />

      <RejectReviewDialog
        open={bulkRejectOpen}
        onOpenChange={setBulkRejectOpen}
        subjectText={`${selectedCount} selected review(s)`}
        note={bulkNote}
        onNoteChange={setBulkNote}
        onConfirm={() => void confirmBulkReject()}
        isSubmitting={actionLoading === 'bulk:rejected'}
        noteInputId="reject-bulk-reviews-note"
      />
    </PermissionGuard>
  );
}

function AdminReviewsRow({
  item,
  isColumnVisible,
  actionLoading,
  isSelected,
  onToggleSelect,
  onApprove,
  onReject,
  onDelete,
}: {
  item: AdminReviewListItem;
  isColumnVisible: (id: string) => boolean;
  actionLoading: string | null;
  isSelected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const approving = actionLoading === `${item.id}:approved`;
  const rejecting = actionLoading === `${item.id}:rejected`;
  const deleting = actionLoading === `${item.id}:delete`;
  const moderationLocked = item.status === 'deleted_by_user';
  const disabled = approving || rejecting || deleting;

  return (
    <TableRow>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={checked => onToggleSelect(checked === true)}
          aria-label={`Select review ${item.id}`}
          disabled={moderationLocked}
        />
      </TableCell>
      <TableCell>
        <div className="max-w-md space-y-1">
          <div className="text-sm">{truncate(item.comment)}</div>
          {item.moderationNote ? (
            <div className="text-muted-foreground text-xs">
              Note: {truncate(item.moderationNote, 80)}
            </div>
          ) : null}
        </div>
      </TableCell>
      {isColumnVisible('product') ? (
        <TableCell>
          <div className="space-y-0.5">
            <div className="font-medium">{item.productName}</div>
            <div className="text-muted-foreground text-xs">/{item.productSlug}</div>
          </div>
        </TableCell>
      ) : null}
      {isColumnVisible('author') ? <TableCell>{item.userName}</TableCell> : null}
      {isColumnVisible('rating') ? <TableCell>{item.rating} / 5</TableCell> : null}
      {isColumnVisible('status') ? (
        <TableCell>
          <div className="flex flex-wrap items-center gap-1.5">
            <ReviewStatusBadge status={item.status} />
            <ReviewPendingContextBadge
              status={item.status}
              editedAt={item.editedAt}
            />
            {item.isSuspicious ? (
              <StatusBadge variant={suspiciousVariant(item.suspiciousScore)}>
                Suspicious {item.suspiciousScore > 0 ? `(score ${item.suspiciousScore})` : ''}
              </StatusBadge>
            ) : null}
          </div>
        </TableCell>
      ) : null}
      {isColumnVisible('updated') ? (
        <TableCell className="text-muted-foreground text-sm">
          {formatDateTime(item.updatedAt)}
        </TableCell>
      ) : null}
      <TableCell className="text-right">
        <div className="flex justify-end">
          <TableActionsMenu
            items={[
              {
                label: 'View Review',
                href: `/admin/reviews/${item.id}`,
                icon: <Eye className="h-4 w-4" />,
              },
              {
                label: approving ? 'Approving...' : 'Approve',
                onClick: onApprove,
                icon: <Check className="h-4 w-4" />,
                disabled: disabled || item.status === 'approved' || moderationLocked,
              },
              {
                label: rejecting ? 'Rejecting...' : 'Reject',
                onClick: onReject,
                icon: <X className="h-4 w-4" />,
                disabled: disabled || item.status === 'rejected' || moderationLocked,
              },
              {
                label: deleting ? 'Deleting...' : 'Delete',
                onClick: onDelete,
                icon: <Trash2 className="h-4 w-4" />,
                destructive: true,
                disabled,
              },
            ]}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

export default AdminReviewsListClient;
