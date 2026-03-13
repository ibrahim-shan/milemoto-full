'use client';

import { useState } from 'react';
import Link from 'next/link';

import { ExternalLink, Plus, Search, Shuffle } from 'lucide-react';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { StockAdjustmentDialog } from '@/features/admin/stock/stock-adjustment-dialog';
import { StockTransferDialog } from '@/features/admin/stock/stock-transfer-dialog';
import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import { useLocalizationFormat } from '@/hooks/useLocalizationFormat';
import { useGetStockMovements } from '@/hooks/useStockQueries';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Input } from '@/ui/input';
import type { SortDirection } from '@/ui/sortable-table-head';
import { SortableTableHead } from '@/ui/sortable-table-head';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

function getReferenceHref(referenceType: string, referenceId: number) {
  switch (referenceType) {
    case 'goodsReceipt':
      return `/admin/goods-receipts/${referenceId}`;
    case 'customer_order':
    case 'order':
      return `/admin/orders/${referenceId}`;
    case 'order_request_return':
      return `/admin/order-requests/${referenceId}`;
    case 'purchaseOrder':
      return `/admin/purchase-orders/${referenceId}`;
    default:
      return null;
  }
}

export default function StockMovementsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<
    'createdAt' | 'sku' | 'productName' | 'stockLocationName' | 'quantity' | 'type' | 'referenceType' | undefined
  >(undefined);
  const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
  const { formatDateTime } = useLocalizationFormat();

  const { data, isLoading, isError, refetch } = useGetStockMovements({
    page,
    limit: pageSize,
    search,
    ...(sortBy ? { sortBy } : {}),
    ...(sortBy && sortDir ? { sortDir } : {}),
  });

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? Math.ceil((totalCount || 0) / pageSize);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const handleSortChange = (nextSortBy?: string, nextSortDir?: SortDirection) => {
    setSortBy(nextSortBy as typeof sortBy);
    setSortDir(nextSortDir);
    setPage(1);
  };

  return (
    <PermissionGuard requiredPermission="stock.read">
      <Card>
        <CardHeader>
          <CardTitle>Stock Movements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                aria-label="Search stock movements"
                placeholder="Search by SKU, product, location, or reference..."
                className="pl-9"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsAdjustmentOpen(true)}
              >
                New Adjustment
              </Button>
              <Button
                variant="solid"
                size="sm"
                leftIcon={<Shuffle className="h-4 w-4" />}
                onClick={() => setIsTransferOpen(true)}
              >
                New Transfer
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableTableHead
                    label="Date"
                    columnKey="createdAt"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSortChange={handleSortChange}
                  />
                </TableHead>
                <TableHead>
                  <SortableTableHead
                    label="SKU"
                    columnKey="sku"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSortChange={handleSortChange}
                  />
                </TableHead>
                <TableHead>
                  <SortableTableHead
                    label="Product / Variant"
                    columnKey="productName"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSortChange={handleSortChange}
                  />
                </TableHead>
                <TableHead>
                  <SortableTableHead
                    label="Location"
                    columnKey="stockLocationName"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSortChange={handleSortChange}
                  />
                </TableHead>
                <TableHead>
                  <SortableTableHead
                    label="Quantity"
                    columnKey="quantity"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSortChange={handleSortChange}
                  />
                </TableHead>
                <TableHead>
                  <SortableTableHead
                    label="Type"
                    columnKey="type"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSortChange={handleSortChange}
                  />
                </TableHead>
                <TableHead>
                  <SortableTableHead
                    label="Reference"
                    columnKey="referenceType"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSortChange={handleSortChange}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
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
                      message="Failed to load stock movements. Please try again."
                      onRetry={refetch}
                    />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground h-32 text-center"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No stock movements found."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map(movement => (
                  <TableRow key={movement.id}>
                    <TableCell>{formatDateTime(movement.createdAt)}</TableCell>
                    <TableCell className="font-mono text-xs">{movement.sku ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{movement.productName ?? '-'}</span>
                        <span className="text-muted-foreground text-xs">
                          {movement.variantName ?? ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{movement.stockLocationName ?? '-'}</TableCell>
                    <TableCell>{movement.quantity}</TableCell>
                    <TableCell className="text-sm capitalize">
                      {movement.type.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      {movement.referenceType && movement.referenceId ? (
                        (() => {
                          const href = getReferenceHref(
                            movement.referenceType,
                            movement.referenceId,
                          );
                          if (!href) {
                            return (
                              <span className="text-xs">
                                {movement.referenceDisplay ??
                                  `${movement.referenceType} #${movement.referenceId}`}
                              </span>
                            );
                          }

                          return (
                            <Link
                              href={href}
                              className="text-primary inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                            >
                              {movement.referenceDisplay ??
                                `${movement.referenceType} #${movement.referenceId}`}
                              <ExternalLink
                                className="h-3 w-3"
                                aria-hidden
                              />
                            </Link>
                          );
                        })()
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
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
      <StockAdjustmentDialog
        open={isAdjustmentOpen}
        onOpenChange={setIsAdjustmentOpen}
      />
      <StockTransferDialog
        open={isTransferOpen}
        onOpenChange={setIsTransferOpen}
      />
    </PermissionGuard>
  );
}
