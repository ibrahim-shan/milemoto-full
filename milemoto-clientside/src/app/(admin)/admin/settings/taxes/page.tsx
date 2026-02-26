'use client';

import React, { useState } from 'react';

import { Edit, MoreHorizontal, Plus, Search, Trash } from 'lucide-react';

import { TaxDialog } from '@/features/admin/settings/taxes/tax-dialog';
import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
// Hooks & Utils
import { useDebounce } from '@/hooks/useDebounce';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { useGetTaxPolicySettings } from '@/hooks/useSiteSettingsQueries';
import { useDeleteTax, useGetTaxes, type Tax } from '@/hooks/useTaxQueries';
// UI Components
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Input } from '@/ui/input';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

export default function TaxesPage() {
  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);

  // Alert Dialog State
  const [taxToDelete, setTaxToDelete] = useState<Tax | null>(null);

  const limit = 10;

  // Get default currency with position and decimals
  const { position: currencyPosition, formatCurrency } = useDefaultCurrency();
  const { data: taxPolicy } = useGetTaxPolicySettings();

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useGetTaxes({
    search: debouncedSearch,
    page,
    limit,
  });

  const deleteMutation = useDeleteTax();

  // Handlers
  const handleOpenAdd = () => {
    setEditingTax(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Tax) => {
    setEditingTax(item);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (tax: Tax) => {
    setTaxToDelete(tax);
  };

  const confirmDelete = () => {
    if (taxToDelete) {
      deleteMutation.mutate(taxToDelete.id);
      setTaxToDelete(null);
    }
  };

  const taxes = data?.items ?? [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);
  const formatDateOnly = (value?: string | Date | null) => {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString();
  };
  const getEffectiveState = (tax: Tax): 'active_now' | 'scheduled' | 'expired' | 'inactive' => {
    if (tax.status !== 'active') return 'inactive';
    // eslint-disable-next-line react-hooks/purity -- current time is required to classify active/scheduled/expired rows at render time
    const now = Date.now();
    const from = tax.validFrom ? new Date(tax.validFrom).getTime() : null;
    const to = tax.validTo ? new Date(tax.validTo).getTime() : null;
    if (from != null && Number.isFinite(from) && from > now) return 'scheduled';
    if (to != null && Number.isFinite(to) && to < now) return 'expired';
    return 'active_now';
  };
  const jurisdictionSourceLabel =
    taxPolicy?.jurisdictionSource === 'billing_country' ? 'Billing country' : 'Shipping country';
  const taxableBaseLabel =
    taxPolicy?.taxableBaseMode === 'subtotal' ? 'Subtotal' : 'Subtotal - Discount';
  const roundingLabel = `${taxPolicy?.roundingPrecision ?? 2} decimals`;
  const shippingTaxLabel = taxPolicy?.shippingTaxable
    ? 'Applied (shipping included in taxable base)'
    : 'Not applied in current checkout';
  const combinationLabel =
    taxPolicy?.combinationMode === 'exclusive'
      ? 'Exclusive (single best match)'
      : 'Stacking (sum matched rules)';
  const fallbackLabel =
    taxPolicy?.fallbackMode === 'block_checkout' ? 'Block checkout' : 'No tax (allow checkout)';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Taxes & Duties</CardTitle>
          <p className="text-muted-foreground text-sm">
            Manage tax rules (rates, countries, dates).
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/20 mb-6 rounded-md border p-4">
            <div className="text-sm font-semibold">
              Current Tax Policy (How checkout uses these rules)
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Jurisdiction source:</span>{' '}
                {jurisdictionSourceLabel}
              </div>
              <div>
                <span className="text-muted-foreground">Rule scope:</span> Global + Country
              </div>
              <div>
                <span className="text-muted-foreground">Rule status:</span> Active rules only
                {', '}within effective date window
              </div>
              <div>
                <span className="text-muted-foreground">Combination:</span> {combinationLabel}
              </div>
              <div>
                <span className="text-muted-foreground">Taxable base:</span> {taxableBaseLabel}
              </div>
              <div>
                <span className="text-muted-foreground">Rounding:</span> {roundingLabel}
              </div>
              <div>
                <span className="text-muted-foreground">Shipping tax:</span> {shippingTaxLabel}
              </div>
              <div>
                <span className="text-muted-foreground">Fallback:</span> {fallbackLabel}
              </div>
              <div>
                <span className="text-muted-foreground">Historical orders:</span> Tax snapshot is
                stored on order
              </div>
            </div>
          </div>

          {/* Toolbar area */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder="Search taxes..."
                className="pl-9"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Button
              variant="solid"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenAdd}
            >
              Add Tax
            </Button>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Effective Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-red-500"
                  >
                    <TableStateMessage
                      variant="error"
                      message="Failed to load taxes. Please try again."
                      onRetry={refetch}
                    />
                  </TableCell>
                </TableRow>
              ) : taxes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground h-32 text-center"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No taxes found. Add one to get started."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                taxes.map(tax => (
                  <TableRow key={tax.id}>
                    <TableCell className="font-medium">{tax.name}</TableCell>
                    <TableCell>
                      {tax.type === 'percentage'
                        ? currencyPosition === 'before'
                          ? `%${tax.rate}`
                          : `${tax.rate}%`
                        : formatCurrency(tax.rate)}
                    </TableCell>
                    <TableCell className="capitalize">{tax.type}</TableCell>
                    <TableCell>
                      {tax.countryName ? (
                        <span className="text-sm">{tax.countryName}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">Global</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tax.validFrom || tax.validTo ? (
                        <div className="space-y-0.5 text-xs">
                          <div>
                            <span className="text-muted-foreground">From:</span>{' '}
                            {formatDateOnly(tax.validFrom) || 'Any'}
                          </div>
                          <div>
                            <span className="text-muted-foreground">To:</span>{' '}
                            {formatDateOnly(tax.validTo) || 'Open'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">Always</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge variant={tax.status === 'active' ? 'success' : 'neutral'}>
                          {tax.status === 'active' ? 'Active' : 'Inactive'}
                        </StatusBadge>
                        {(() => {
                          const effectiveState = getEffectiveState(tax);
                          if (effectiveState === 'active_now') {
                            return <StatusBadge variant="info">Active Now</StatusBadge>;
                          }
                          if (effectiveState === 'scheduled') {
                            return <StatusBadge variant="warning">Scheduled</StatusBadge>;
                          }
                          if (effectiveState === 'expired') {
                            return <StatusBadge variant="error">Expired</StatusBadge>;
                          }
                          return null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Open menu"
                            justify="center"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(tax)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(tax)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Reusable Pagination Component */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-muted-foreground text-sm">
              Page {page} of {totalPages} (Total {totalCount} items)
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

      {/* Add/Edit Modal */}
      <TaxDialog
        key={editingTax?.id ?? 'new'}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        tax={editingTax}
      />

      {/* Delete Alert Dialog */}
      <AlertDialog
        open={!!taxToDelete}
        onOpenChange={open => !open && setTaxToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tax Rate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the
              <span className="text-foreground font-semibold"> {taxToDelete?.name} </span>
              tax rate. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
