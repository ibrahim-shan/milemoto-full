'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Eye, MoreHorizontal } from 'lucide-react';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { GoodsReceiptFilters } from '@/features/admin/goods-receipts/goods-receipt-filters';
import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useGetGoodsReceipts } from '@/hooks/useGoodsReceiptQueries';
import { useLocalizationFormat } from '@/hooks/useLocalizationFormat';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { ColumnVisibilityMenu } from '@/ui/column-visibility-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import type { SortDirection } from '@/ui/sortable-table-head';
import { SortableTableHead } from '@/ui/sortable-table-head';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

const GOODS_RECEIPT_COLUMNS = [
  { id: 'grnNumber', label: 'GRN #', alwaysVisible: true },
  { id: 'poNumber', label: 'PO #' },
  { id: 'status', label: 'Status' },
  { id: 'receivedAt', label: 'Received At' },
  { id: 'actions', label: 'Actions', alwaysVisible: true },
] as const;

export default function GoodsReceiptsPage() {
  const columns = GOODS_RECEIPT_COLUMNS;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'grnNumber' | 'poNumber' | 'status' | 'receivedAt' | undefined>(
    undefined,
  );
  const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
  const [filters, setFilters] = useState<Record<string, string | number | boolean | string[] | undefined>>({
    filterMode: 'all',
    status: '',
    dateFrom: '',
    dateTo: '',
  });
  const { formatDateTime } = useLocalizationFormat();
  const { visibility: columnVisibility, setVisibility: setColumnVisibility } = useColumnVisibility(
    columns,
    'admin.goods-receipts.columns',
  );

  const { data, isLoading, isError, refetch } = useGetGoodsReceipts({
    page,
    limit: pageSize,
    ...(search ? { search } : {}),
    ...(filters.filterMode === 'any' ? { filterMode: 'any' as const } : {}),
    ...(filters.status ? { status: filters.status as 'draft' | 'posted' } : {}),
    ...(filters.dateFrom ? { dateFrom: String(filters.dateFrom) } : {}),
    ...(filters.dateTo ? { dateTo: String(filters.dateTo) } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(sortBy && sortDir ? { sortDir } : {}),
  });

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? Math.ceil((totalCount || 0) / pageSize);
  const isColumnVisible = (id: string) => {
    const column = columns.find(item => item.id === id);
    if (column && 'alwaysVisible' in column && column.alwaysVisible) return true;
    return columnVisibility[id] !== false;
  };
  const visibleColumnCount = columns.reduce(
    (count, column) => count + (isColumnVisible(column.id) ? 1 : 0),
    0,
  );
  const handleSortChange = (nextSortBy?: string, nextSortDir?: SortDirection) => {
    setSortBy(nextSortBy as typeof sortBy);
    setSortDir(nextSortDir);
    setPage(1);
  };

  return (
    <PermissionGuard requiredPermission="goods_receipts.read">
      <Card>
        <CardHeader>
          <CardTitle>Goods Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <GoodsReceiptFilters
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
                <ColumnVisibilityMenu
                  columns={columns}
                  visibility={columnVisibility}
                  onToggle={(columnId, visible) =>
                    setColumnVisibility(prev => ({ ...prev, [columnId]: visible }))
                  }
                />
              }
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                {isColumnVisible('grnNumber') && (
                  <TableHead>
                    <SortableTableHead
                      label="GRN #"
                      columnKey="grnNumber"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('poNumber') && (
                  <TableHead>
                    <SortableTableHead
                      label="PO #"
                      columnKey="poNumber"
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
                {isColumnVisible('receivedAt') && (
                  <TableHead>
                    <SortableTableHead
                      label="Received At"
                      columnKey="receivedAt"
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
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    {isColumnVisible('grnNumber') && (
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    )}
                    {isColumnVisible('poNumber') && (
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    )}
                    {isColumnVisible('status') && (
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    )}
                    {isColumnVisible('receivedAt') && (
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                    )}
                    {isColumnVisible('actions') && (
                      <TableCell>
                        <Skeleton className="h-8 w-16" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="h-24 text-center text-red-500"
                  >
                    <TableStateMessage
                      variant="error"
                      message="Failed to load goods receipts. Please try again."
                      onRetry={refetch}
                    />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="text-muted-foreground h-32 text-center"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No goods receipts found."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map(grn => (
                  <TableRow key={grn.id}>
                    {isColumnVisible('grnNumber') && (
                      <TableCell className="font-mono text-xs">{grn.grnNumber}</TableCell>
                    )}
                    {isColumnVisible('poNumber') && (
                      <TableCell className="font-mono text-xs">
                        {grn.purchaseOrderNumber ?? `#${grn.purchaseOrderId}`}
                      </TableCell>
                    )}
                    {isColumnVisible('status') && (
                      <TableCell>
                        <StatusBadge variant={grn.status === 'posted' ? 'success' : 'neutral'}>
                          {grn.status}
                        </StatusBadge>
                      </TableCell>
                    )}
                    {isColumnVisible('receivedAt') && (
                      <TableCell>
                        {grn.postedAt
                          ? formatDateTime(grn.postedAt)
                          : grn.createdAt
                            ? formatDateTime(grn.createdAt)
                            : '-'}
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
                              justify="center"
                            >
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/goods-receipts/${grn.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-muted-foreground text-sm">
                Page {page} of {totalPages} (Total {totalCount} items)
              </div>
              <PaginationControls
                totalCount={totalCount}
                pageSize={pageSize}
                currentPage={page}
                onPageChange={setPage}
                onPageSizeChange={next => {
                  setPageSize(next);
                  setPage(1);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </PermissionGuard>
  );
}
