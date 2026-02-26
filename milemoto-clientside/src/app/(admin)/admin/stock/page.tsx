'use client';

import { useState } from 'react';

import { AlertTriangle, DollarSign, MapPin, Package, Search, TrendingUp } from 'lucide-react';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { useGetStockLevels, useGetStockSummary } from '@/hooks/useStockQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { ColumnVisibilityMenu } from '@/ui/column-visibility-menu';
import { Input } from '@/ui/input';
import { StatsCards } from '@/ui/stats-cards';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip';

export default function StockPage() {
  const columns: Array<{ id: string; label: string; alwaysVisible?: boolean }> = [
    { id: 'sku', label: 'SKU' },
    { id: 'product', label: 'Product / Variant' },
    { id: 'location', label: 'Location' },
    { id: 'buyingPrice', label: 'Buying Price' },
    { id: 'sellingPrice', label: 'Selling Price' },
    { id: 'onHand', label: 'On Hand' },
    { id: 'allocated', label: 'Allocated' },
    { id: 'onOrder', label: 'On Order' },
  ];

  const fmtPrice = (val: number | null | undefined) =>
    val == null ? '—' : `$${Number(val).toFixed(2)}`;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(columns.map(column => [column.id, true])),
  );

  const { data, isLoading, isError, refetch } = useGetStockLevels({
    page,
    limit: pageSize,
    search,
  });
  const { data: summary } = useGetStockSummary();
  const { formatCurrency } = useDefaultCurrency();

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
  const statItems = [
    {
      label: 'Number of stocks',
      value: String(summary?.locationCount ?? 0),
      icon: MapPin,
    },
    {
      label: 'Products Quantity',
      value: new Intl.NumberFormat().format(summary?.productsQuantity ?? 0),
      icon: Package,
    },
    {
      label: 'Total Stock Value',
      value: formatCurrency(summary?.totalStockValue ?? 0),
      icon: DollarSign,
    },
    {
      label: 'Expected Revenue',
      value: formatCurrency(summary?.expectedRevenue ?? 0),
      icon: TrendingUp,
    },
  ];

  return (
    <PermissionGuard requiredPermission="stock.read">
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsCards data={statItems} />

          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                aria-label="Search stock levels"
                placeholder="Search by SKU, product, or location..."
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
                {isColumnVisible('sku') && <TableHead>SKU</TableHead>}
                {isColumnVisible('product') && <TableHead>Product / Variant</TableHead>}
                {isColumnVisible('location') && <TableHead>Location</TableHead>}
                {isColumnVisible('buyingPrice') && <TableHead>Buying Price</TableHead>}
                {isColumnVisible('sellingPrice') && <TableHead>Selling Price</TableHead>}
                {isColumnVisible('onHand') && <TableHead>On Hand</TableHead>}
                {isColumnVisible('allocated') && <TableHead>Allocated</TableHead>}
                {isColumnVisible('onOrder') && <TableHead>On Order</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    {isColumnVisible('sku') && (
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    )}
                    {isColumnVisible('product') && (
                      <TableCell>
                        <Skeleton className="h-5 w-40" />
                      </TableCell>
                    )}
                    {isColumnVisible('location') && (
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                    )}
                    {isColumnVisible('buyingPrice') && (
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    )}
                    {isColumnVisible('sellingPrice') && (
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    )}
                    {isColumnVisible('onHand') && (
                      <TableCell>
                        <Skeleton className="h-5 w-12" />
                      </TableCell>
                    )}
                    {isColumnVisible('allocated') && (
                      <TableCell>
                        <Skeleton className="h-5 w-12" />
                      </TableCell>
                    )}
                    {isColumnVisible('onOrder') && (
                      <TableCell>
                        <Skeleton className="h-5 w-12" />
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
                      message="Failed to load stock levels. Please try again."
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
                      message="No stock levels found."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map(level => (
                  <TableRow key={`${level.productVariantId}-${level.stockLocationId}`}>
                    {isColumnVisible('sku') && (
                      <TableCell className="font-mono text-xs">{level.sku ?? '-'}</TableCell>
                    )}
                    {isColumnVisible('product') && (
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{level.productName ?? '-'}</span>
                          <span className="text-muted-foreground text-xs">
                            {level.variantName ?? ''}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible('location') && (
                      <TableCell>{level.stockLocationName ?? '-'}</TableCell>
                    )}
                    {isColumnVisible('buyingPrice') && (
                      <TableCell className="font-mono text-xs">
                        {fmtPrice(level.costPrice)}
                      </TableCell>
                    )}
                    {isColumnVisible('sellingPrice') && (
                      <TableCell className="font-mono text-xs">{fmtPrice(level.price)}</TableCell>
                    )}
                    {isColumnVisible('onHand') && (
                      <TableCell>
                        {(() => {
                          const onHand = Number(level.onHand);
                          const threshold = level.lowStockThreshold;
                          const isLowStock =
                            threshold !== undefined && threshold !== null && onHand <= threshold;

                          if (isLowStock) {
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-destructive inline-flex items-center gap-2 font-medium">
                                      <AlertTriangle className="h-4 w-4" />
                                      <span>{onHand}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Low Stock! Threshold: {threshold}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          }

                          return onHand;
                        })()}
                      </TableCell>
                    )}
                    {isColumnVisible('allocated') && <TableCell>{level.allocated}</TableCell>}
                    {isColumnVisible('onOrder') && <TableCell>{level.onOrder}</TableCell>}
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
