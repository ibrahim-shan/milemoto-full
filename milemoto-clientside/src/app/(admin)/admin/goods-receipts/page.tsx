'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Eye, MoreHorizontal, Search } from 'lucide-react';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
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
import { Input } from '@/ui/input';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

export default function GoodsReceiptsPage() {
  const columns = [
    { id: 'grnNumber', label: 'GRN #' },
    { id: 'poNumber', label: 'PO #' },
    { id: 'status', label: 'Status' },
    { id: 'receivedAt', label: 'Received At' },
    { id: 'actions', label: 'Actions', alwaysVisible: true },
  ];

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const { formatDateTime } = useLocalizationFormat();
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(columns.map(column => [column.id, true])),
  );

  const { data, isLoading, isError, refetch } = useGetGoodsReceipts({
    page,
    limit: pageSize,
    ...(search ? { search } : {}),
  });

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? Math.ceil((totalCount || 0) / pageSize);
  const isColumnVisible = (id: string) => {
    const column = columns.find(item => item.id === id);
    if (column?.alwaysVisible) return true;
    return columnVisibility[id] !== false;
  };
  const visibleColumnCount = columns.reduce(
    (count, column) => count + (isColumnVisible(column.id) ? 1 : 0),
    0,
  );

  return (
    <PermissionGuard requiredPermission="goods_receipts.read">
      <Card>
        <CardHeader>
          <CardTitle>Goods Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder="Search goods receipts..."
                className="pl-9"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <ColumnVisibilityMenu
              columns={columns}
              visibility={columnVisibility}
              onToggle={(columnId, visible) =>
                setColumnVisibility(prev => ({ ...prev, [columnId]: visible }))
              }
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                {isColumnVisible('grnNumber') && <TableHead>GRN #</TableHead>}
                {isColumnVisible('poNumber') && <TableHead>PO #</TableHead>}
                {isColumnVisible('status') && <TableHead>Status</TableHead>}
                {isColumnVisible('receivedAt') && <TableHead>Received At</TableHead>}
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
