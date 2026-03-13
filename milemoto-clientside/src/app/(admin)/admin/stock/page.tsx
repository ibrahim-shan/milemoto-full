'use client';

import { useState } from 'react';

import { AlertTriangle, DollarSign, MapPin, Package, TrendingUp } from 'lucide-react';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { StockFilters } from '@/features/admin/stock/stock-filters';
import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { useGetStockLevels, useGetStockSummary } from '@/hooks/useStockQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { ColumnVisibilityMenu } from '@/ui/column-visibility-menu';
import type { SortDirection } from '@/ui/sortable-table-head';
import { SortableTableHead } from '@/ui/sortable-table-head';
import { StatsCards } from '@/ui/stats-cards';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip';

const STOCK_COLUMNS: Array<{ id: string; label: string; alwaysVisible?: boolean }> = [
  { id: 'sku', label: 'SKU', alwaysVisible: true },
  { id: 'product', label: 'Product / Variant' },
  { id: 'location', label: 'Location' },
  { id: 'buyingPrice', label: 'Buying Price' },
  { id: 'sellingPrice', label: 'Selling Price' },
  { id: 'onHand', label: 'On Hand' },
  { id: 'allocated', label: 'Allocated' },
  { id: 'onOrder', label: 'On Order' },
];

export default function StockPage() {
  const columns = STOCK_COLUMNS;

  const fmtPrice = (val: number | null | undefined) =>
    val == null ? '—' : `$${Number(val).toFixed(2)}`;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<
    | 'sku'
    | 'productName'
    | 'stockLocationName'
    | 'costPrice'
    | 'price'
    | 'onHand'
    | 'allocated'
    | 'onOrder'
    | undefined
  >(undefined);
  const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
  const [filters, setFilters] = useState<
    Record<string, string | number | boolean | string[] | undefined>
  >({
    brandId: '',
    categoryId: '',
    subCategoryId: '',
    stockLocationId: '',
    filterMode: 'all',
    lowStockOnly: false,
    outOfStockOnly: false,
    allocatedOnly: false,
    onOrderOnly: false,
  });
  const { visibility: columnVisibility, setVisibility: setColumnVisibility } = useColumnVisibility(
    columns,
    'admin.stock.columns',
  );

  const stockLevelQuery = {
    page,
    limit: pageSize,
    search,
    ...(filters.brandId ? { brandId: Number(filters.brandId) } : {}),
    ...(filters.categoryId ? { categoryId: Number(filters.categoryId) } : {}),
    ...(filters.subCategoryId ? { subCategoryId: Number(filters.subCategoryId) } : {}),
    ...(filters.stockLocationId ? { stockLocationId: Number(filters.stockLocationId) } : {}),
    ...(filters.lowStockOnly === true ? { lowStockOnly: true } : {}),
    ...(filters.outOfStockOnly === true ? { outOfStockOnly: true } : {}),
    ...(filters.allocatedOnly === true ? { allocatedOnly: true } : {}),
    ...(filters.onOrderOnly === true ? { onOrderOnly: true } : {}),
    ...(filters.filterMode === 'any' ? { filterMode: 'any' as const } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(sortBy && sortDir ? { sortDir } : {}),
  };

  const { data, isLoading, isError, refetch } = useGetStockLevels(stockLevelQuery);
  const { data: summary } = useGetStockSummary();
  const { formatCurrency } = useDefaultCurrency();

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

  const handleSortChange = (nextSortBy?: string, nextSortDir?: SortDirection) => {
    setSortBy(nextSortBy as typeof sortBy);
    setSortDir(nextSortDir);
    setPage(1);
  };

  return (
    <PermissionGuard requiredPermission="stock.read">
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsCards data={statItems} />

          <div className="mb-6">
            <StockFilters
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

          <div className="text-muted-foreground mb-4 hidden rounded-md border p-3 font-mono text-xs">
            <div>debug.filters: {JSON.stringify(filters)}</div>
            <div>debug.query: {JSON.stringify(stockLevelQuery)}</div>
            <div>
              debug.result: {isLoading ? 'loading' : `items=${items.length}, total=${totalCount}`}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                {isColumnVisible('sku') && (
                  <TableHead>
                    <SortableTableHead
                      label="SKU"
                      columnKey="sku"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('product') && (
                  <TableHead>
                    <SortableTableHead
                      label="Product / Variant"
                      columnKey="productName"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('location') && (
                  <TableHead>
                    <SortableTableHead
                      label="Location"
                      columnKey="stockLocationName"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('buyingPrice') && (
                  <TableHead>
                    <SortableTableHead
                      label="Buying Price"
                      columnKey="costPrice"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('sellingPrice') && (
                  <TableHead>
                    <SortableTableHead
                      label="Selling Price"
                      columnKey="price"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('onHand') && (
                  <TableHead>
                    <SortableTableHead
                      label="On Hand"
                      columnKey="onHand"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('allocated') && (
                  <TableHead>
                    <SortableTableHead
                      label="Allocated"
                      columnKey="allocated"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('onOrder') && (
                  <TableHead>
                    <SortableTableHead
                      label="On Order"
                      columnKey="onOrder"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
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

