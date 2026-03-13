'use client';

import { useMemo, useState } from 'react';

import type { CreateCouponDto } from '@milemoto/types';
import { Edit, MoreHorizontal, Plus, Trash } from 'lucide-react';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { DiscountFilters } from '@/features/admin/discounts/discount-filters';
import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import {
  Coupon, 
  useCreateCoupon,
  useDeleteCoupon,
  useGetCoupons,
  useUpdateCoupon,
} from '@/hooks/useCouponQueries';
import { useDebounce } from '@/hooks/useDebounce';
import { useMyPermissions } from '@/hooks/useMyPermissions';
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
import { ColumnVisibilityMenu } from '@/ui/column-visibility-menu';
import { DateTimePicker } from '@/ui/date-time-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import type { SortDirection } from '@/ui/sortable-table-head';
import { SortableTableHead } from '@/ui/sortable-table-head';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

function toLocalDateTimeInput(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const offsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatTableDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

type EffectiveCouponStatus = {
  label: 'Inactive' | 'Scheduled' | 'Expired' | 'Fully Used' | 'Running Low' | 'Active';
  variant: 'neutral' | 'info' | 'error' | 'warning' | 'success';
};

function getEffectiveCouponStatus(coupon: Coupon): EffectiveCouponStatus {
  if (coupon.status === 'inactive') {
    return { label: 'Inactive', variant: 'neutral' };
  }

  const now = new Date();
  const startsAt = coupon.startsAt ? new Date(coupon.startsAt) : null;
  const endsAt = coupon.endsAt ? new Date(coupon.endsAt) : null;

  if (startsAt && !Number.isNaN(startsAt.getTime()) && now < startsAt) {
    return { label: 'Scheduled', variant: 'info' };
  }

  if (endsAt && !Number.isNaN(endsAt.getTime()) && now > endsAt) {
    return { label: 'Expired', variant: 'error' };
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { label: 'Fully Used', variant: 'error' };
  }

  if (coupon.usageLimit != null && coupon.usageLimit > 0) {
    const remaining = coupon.usageLimit - coupon.usedCount;
    const ratio = remaining / coupon.usageLimit;
    if (remaining > 0 && ratio <= 0.1) {
      return { label: 'Running Low', variant: 'warning' };
    }
  }

  return { label: 'Active', variant: 'success' };
}

type CouponDialogProps = {
  coupon: Coupon | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function CouponDialog({ coupon, open, onOpenChange }: CouponDialogProps) {
  const isEdit = Boolean(coupon);
  const createMutation = useCreateCoupon();
  const updateMutation = useUpdateCoupon();

  const initialData = useMemo(
    () => ({
      code: coupon?.code ?? '',
      type: coupon?.type ?? ('fixed' as Coupon['type']),
      value: coupon ? String(coupon.value) : '',
      minSubtotal: coupon?.minSubtotal != null ? String(coupon.minSubtotal) : '',
      maxDiscount: coupon?.maxDiscount != null ? String(coupon.maxDiscount) : '',
      startsAt: toLocalDateTimeInput(coupon?.startsAt ?? null),
      endsAt: toLocalDateTimeInput(coupon?.endsAt ?? null),
      status: coupon?.status ?? ('active' as Coupon['status']),
      usageLimit: coupon?.usageLimit != null ? String(coupon.usageLimit) : '',
      perUserLimit: coupon?.perUserLimit != null ? String(coupon.perUserLimit) : '',
    }),
    [coupon],
  );

  const [formData, setFormData] = useState(initialData);
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const toNullableNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  };

  const toNullableDate = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? new Date(trimmed).toISOString() : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: CreateCouponDto = {
      code: formData.code.trim(),
      type: formData.type,
      value: Number(formData.value || '0'),
      status: formData.status,
      minSubtotal: toNullableNumber(formData.minSubtotal),
      maxDiscount: toNullableNumber(formData.maxDiscount),
      startsAt: toNullableDate(formData.startsAt),
      endsAt: toNullableDate(formData.endsAt),
      usageLimit: toNullableNumber(formData.usageLimit),
      perUserLimit: toNullableNumber(formData.perUserLimit),
    };

    try {
      if (isEdit && coupon) {
        await updateMutation.mutateAsync({ id: coupon.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // handled by hooks toast
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Coupon' : 'Add Coupon'}</DialogTitle>
            <DialogDescription>
              Configure discount type, validity, and usage limits.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-code">Code*</Label>
              <Input
                id="coupon-code"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
                placeholder="SAVE10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-status">Status*</Label>
              <Select
                value={formData.status}
                onValueChange={value =>
                  setFormData({ ...formData, status: value as Coupon['status'] })
                }
              >
                <SelectTrigger id="coupon-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-type">Type*</Label>
              <Select
                value={formData.type}
                onValueChange={value => setFormData({ ...formData, type: value as Coupon['type'] })}
              >
                <SelectTrigger id="coupon-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-value">Value*</Label>
              <Input
                id="coupon-value"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.value}
                onChange={e => setFormData({ ...formData, value: e.target.value })}
                placeholder={formData.type === 'percentage' ? '10' : '25'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-min-subtotal">Min Subtotal</Label>
              <Input
                id="coupon-min-subtotal"
                type="number"
                min="0"
                step="0.01"
                value={formData.minSubtotal}
                onChange={e => setFormData({ ...formData, minSubtotal: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-max-discount">Max Discount</Label>
              <Input
                id="coupon-max-discount"
                type="number"
                min="0"
                step="0.01"
                value={formData.maxDiscount}
                onChange={e => setFormData({ ...formData, maxDiscount: e.target.value })}
                disabled={formData.type === 'fixed'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-starts-at-time">Starts At</Label>
              <DateTimePicker
                id="coupon-starts-at"
                value={formData.startsAt}
                onChange={value => setFormData({ ...formData, startsAt: value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-ends-at-time">Ends At</Label>
              <DateTimePicker
                id="coupon-ends-at"
                value={formData.endsAt}
                onChange={value => setFormData({ ...formData, endsAt: value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-usage-limit">Usage Limit</Label>
              <Input
                id="coupon-usage-limit"
                type="number"
                min="1"
                step="1"
                value={formData.usageLimit}
                onChange={e => setFormData({ ...formData, usageLimit: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-per-user-limit">Per User Limit</Label>
              <Input
                id="coupon-per-user-limit"
                type="number"
                min="1"
                step="1"
                value={formData.perUserLimit}
                onChange={e => setFormData({ ...formData, perUserLimit: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              isLoading={isLoading}
              disabled={isLoading || !formData.code.trim() || !formData.value.trim()}
            >
              {isEdit ? 'Update Coupon' : 'Add Coupon'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DiscountsPage() {
  const columns = useMemo(
    () =>
      [
        { id: 'code', label: 'Code' },
        { id: 'type', label: 'Type' },
        { id: 'value', label: 'Value' },
        { id: 'startsAt', label: 'Starts At' },
        { id: 'endsAt', label: 'Ends At' },
        { id: 'usedLimit', label: 'Used / Limit' },
        { id: 'status', label: 'Status' },
        { id: 'actions', label: 'Actions', alwaysVisible: true },
      ] as const,
    [],
  );

  const { data: perms } = useMyPermissions();
  const canManage = perms?.includes('discounts.manage') ?? false;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [sortBy, setSortBy] = useState<
    'code' | 'type' | 'value' | 'startsAt' | 'endsAt' | 'usedCount' | 'status' | 'createdAt' | undefined
  >(undefined);
  const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
  const [filters, setFilters] = useState<Record<string, string | number | boolean | string[] | undefined>>({
    filterMode: 'all',
    status: '',
    type: '',
    dateFrom: '',
    dateTo: '',
  });
  const limit = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const {
    visibility: columnVisibility,
    setVisibility: setColumnVisibility,
    isColumnVisible,
    visibleColumnCount,
  } = useColumnVisibility(columns, 'admin.discounts.columns');

  const { data, isLoading, isError, refetch } = useGetCoupons({
    page,
    limit,
    search: debouncedSearch,
    ...(filters.status ? { status: filters.status as 'active' | 'inactive' } : {}),
    ...(filters.type ? { type: filters.type as 'fixed' | 'percentage' } : {}),
    ...(filters.dateFrom ? { dateFrom: String(filters.dateFrom) } : {}),
    ...(filters.dateTo ? { dateTo: String(filters.dateTo) } : {}),
    ...(filters.filterMode === 'any' ? { filterMode: 'any' as const } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(sortBy && sortDir ? { sortDir } : {}),
  });
  const deleteMutation = useDeleteCoupon();

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / limit);
  const handleSortChange = (nextSortBy?: string, nextSortDir?: SortDirection) => {
    setSortBy(nextSortBy as typeof sortBy);
    setSortDir(nextSortDir);
    setPage(1);
  };

  const handleDelete = () => {
    if (!couponToDelete) return;
    deleteMutation.mutate(couponToDelete.id);
    setCouponToDelete(null);
  };

  return (
    <PermissionGuard requiredPermission="discounts.read">
      <Card>
        <CardHeader>
          <CardTitle>Discounts & Coupons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <DiscountFilters
              filters={filters}
              onFilterChange={nextFilters => {
                setFilters(nextFilters);
                setPage(1);
              }}
              search={search}
              onSearchChange={value => {
                setSearch(value);
                setPage(1);
              }}
              actions={
                <div className="flex items-center gap-2">
                  <ColumnVisibilityMenu
                    columns={columns}
                    visibility={columnVisibility}
                    onToggle={(columnId, visible) =>
                      setColumnVisibility(prev => ({ ...prev, [columnId]: visible }))
                    }
                  />
                  {canManage && (
                    <Button
                      variant="solid"
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => {
                        setEditingCoupon(null);
                        setIsModalOpen(true);
                      }}
                    >
                      Add Coupon
                    </Button>
                  )}
                </div>
              }
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                {isColumnVisible('code') && (
                  <TableHead>
                    <SortableTableHead
                      label="Code"
                      columnKey="code"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('type') && (
                  <TableHead>
                    <SortableTableHead
                      label="Type"
                      columnKey="type"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('value') && (
                  <TableHead>
                    <SortableTableHead
                      label="Value"
                      columnKey="value"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('startsAt') && (
                  <TableHead>
                    <SortableTableHead
                      label="Starts At"
                      columnKey="startsAt"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('endsAt') && (
                  <TableHead>
                    <SortableTableHead
                      label="Ends At"
                      columnKey="endsAt"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('usedLimit') && (
                  <TableHead>
                    <SortableTableHead
                      label="Used / Limit"
                      columnKey="usedCount"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('status') && (
                  <TableHead>
                    <SortableTableHead
                      label="Status"
                      columnKey="status"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('actions') && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {isColumnVisible('code') && (
                      <TableCell>
                        <Skeleton className="h-5 w-28" />
                      </TableCell>
                    )}
                    {isColumnVisible('type') && (
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    )}
                    {isColumnVisible('value') && (
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    )}
                    {isColumnVisible('startsAt') && (
                      <TableCell>
                        <Skeleton className="h-5 w-28" />
                      </TableCell>
                    )}
                    {isColumnVisible('endsAt') && (
                      <TableCell>
                        <Skeleton className="h-5 w-28" />
                      </TableCell>
                    )}
                    {isColumnVisible('usedLimit') && (
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    )}
                    {isColumnVisible('status') && (
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    )}
                    {isColumnVisible('actions') && (
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnCount}>
                    <TableStateMessage
                      variant="error"
                      message="Failed to load coupons."
                      onRetry={refetch}
                    />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnCount}>
                    <TableStateMessage
                      variant="empty"
                      message="No coupons found. Add one to get started."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map(coupon => {
                  const effectiveStatus = getEffectiveCouponStatus(coupon);
                  return (
                    <TableRow key={coupon.id}>
                      {isColumnVisible('code') && (
                        <TableCell className="font-medium">{coupon.code}</TableCell>
                      )}
                      {isColumnVisible('type') && (
                        <TableCell>{coupon.type === 'fixed' ? 'Fixed' : 'Percentage'}</TableCell>
                      )}
                      {isColumnVisible('value') && (
                        <TableCell>
                          {coupon.type === 'fixed' ? coupon.value.toFixed(2) : `${coupon.value}%`}
                        </TableCell>
                      )}
                      {isColumnVisible('startsAt') && (
                        <TableCell>{formatTableDateTime(coupon.startsAt)}</TableCell>
                      )}
                      {isColumnVisible('endsAt') && (
                        <TableCell>{formatTableDateTime(coupon.endsAt)}</TableCell>
                      )}
                      {isColumnVisible('usedLimit') && (
                        <TableCell>
                          {coupon.usedCount} / {coupon.usageLimit ?? '\u221e'}
                        </TableCell>
                      )}
                      {isColumnVisible('status') && (
                        <TableCell>
                          <StatusBadge variant={effectiveStatus.variant}>
                            {effectiveStatus.label}
                          </StatusBadge>
                        </TableCell>
                      )}
                      {isColumnVisible('actions') && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Open actions"
                                justify="center"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canManage && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingCoupon(coupon);
                                    setIsModalOpen(true);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canManage && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setCouponToDelete(coupon)}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between pt-4">
            <div className="text-muted-foreground text-sm">
              Page {page} of {totalPages || 1} (Total {totalCount} items)
            </div>
            <PaginationControls
              totalCount={totalCount}
              pageSize={limit}
              currentPage={page}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>

      <CouponDialog
        key={editingCoupon?.id ?? 'new'}
        coupon={editingCoupon}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />

      <AlertDialog
        open={Boolean(couponToDelete)}
        onOpenChange={open => !open && setCouponToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete coupon
              <span className="text-foreground font-semibold"> {couponToDelete?.code} </span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PermissionGuard>
  );
}
