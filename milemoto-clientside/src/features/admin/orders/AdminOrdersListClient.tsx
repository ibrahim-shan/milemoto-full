'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { AdminOrderStatusBadge } from './order-status';
import { Eye } from 'lucide-react';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { OrderFilters } from '@/features/admin/orders/order-filters';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { fetchAdminOrderFilterOptions, fetchAdminOrders } from '@/lib/admin-orders';
import type {
  AdminOrderFilterOptionsResponse,
  AdminOrderListItem,
  AdminOrdersListResponse,
} from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { ColumnVisibilityMenu } from '@/ui/column-visibility-menu';
import { SortDirection, SortableTableHead } from '@/ui/sortable-table-head';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableActionsMenu } from '@/ui/table-actions-menu';
import { TablePaginationFooter } from '@/ui/table-pagination-footer';
import { TableStateMessage } from '@/ui/table-state-message';

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || 'USD'}`;
  }
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

const ORDER_COLUMNS = [
  { id: 'order', label: 'Order', alwaysVisible: true },
  { id: 'customer', label: 'Customer' },
  { id: 'status', label: 'Status' },
  { id: 'payment', label: 'Payment' },
  { id: 'items', label: 'Items' },
  { id: 'placed', label: 'Placed' },
  { id: 'total', label: 'Total' },
  { id: 'actions', label: 'Actions', alwaysVisible: true },
] as const;

export function AdminOrdersListClient() {
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput.trim());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<
    | 'orderNumber'
    | 'customerName'
    | 'status'
    | 'paymentStatus'
    | 'paymentMethod'
    | 'itemCount'
    | 'placedAt'
    | 'grandTotal'
    | 'createdAt'
    | undefined
  >(undefined);
  const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
  const [filters, setFilters] = useState<Record<string, string | number | boolean | string[] | undefined>>({
    filterMode: 'all',
    status: '',
    paymentStatus: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
  });
  const {
    visibility: columnVisibility,
    setVisibility: setColumnVisibility,
    isColumnVisible,
    visibleColumnCount,
  } = useColumnVisibility(ORDER_COLUMNS, 'admin.orders.columns');
  const [data, setData] = useState<AdminOrdersListResponse | null>(null);
  const [filterOptions, setFilterOptions] = useState<AdminOrderFilterOptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, filters]);

  const query = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: deferredSearch || undefined,
      ...(filters.filterMode === 'any' ? { filterMode: 'any' as const } : {}),
      ...(filters.status ? { status: String(filters.status) } : {}),
      ...(filters.paymentStatus ? { paymentStatus: String(filters.paymentStatus) } : {}),
      ...(filters.paymentMethod ? { paymentMethod: String(filters.paymentMethod) } : {}),
      ...(filters.dateFrom ? { dateFrom: String(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { dateTo: String(filters.dateTo) } : {}),
      sortBy: sortBy || undefined,
      sortDir: sortBy && sortDir ? sortDir : undefined,
    }),
    [deferredSearch, filters, page, pageSize, sortBy, sortDir],
  );

  const handleSortChange = (nextSortBy?: string, nextSortDir?: SortDirection) => {
    setSortBy(nextSortBy as typeof sortBy);
    setSortDir(nextSortDir);
    setPage(1);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAdminOrders(query)
      .then(result => {
        if (!cancelled) setData(result);
      })
      .catch(err => {
        if (!cancelled) setError((err as { message?: string })?.message || 'Failed to load orders');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    fetchAdminOrderFilterOptions()
      .then(result => {
        if (!cancelled) {
          setFilterOptions(result);
          setFilterOptionsError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setFilterOptionsError(
            (err as { message?: string })?.message || 'Failed to load order filter options',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <PermissionGuard requiredPermission="orders.read">
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <OrderFilters
              filters={filters}
              onFilterChange={setFilters}
              search={searchInput}
              onSearchChange={setSearchInput}
              paymentMethodOptions={(filterOptions?.paymentMethods ?? []).map(value => ({
                label: value,
                value,
              }))}
              actions={
                <ColumnVisibilityMenu
                  columns={ORDER_COLUMNS}
                  visibility={columnVisibility}
                  onToggle={(columnId, visible) =>
                    setColumnVisibility(prev => ({ ...prev, [columnId]: visible }))
                  }
                />
              }
            />
            {filterOptionsError ? (
              <div className="text-muted-foreground mt-2 text-xs">{filterOptionsError}</div>
            ) : null}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableTableHead
                    label="Order"
                    columnKey="orderNumber"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSortChange={handleSortChange}
                  />
                </TableHead>
                {isColumnVisible('customer') ? (
                  <TableHead>
                    <SortableTableHead
                      label="Customer"
                      columnKey="customerName"
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
                {isColumnVisible('payment') ? (
                  <TableHead>
                    <SortableTableHead
                      label="Payment"
                      columnKey="paymentStatus"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                ) : null}
                {isColumnVisible('items') ? (
                  <TableHead>
                    <SortableTableHead
                      label="Items"
                      columnKey="itemCount"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                ) : null}
                {isColumnVisible('placed') ? (
                  <TableHead>
                    <SortableTableHead
                      label="Placed"
                      columnKey="placedAt"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                ) : null}
                {isColumnVisible('total') ? (
                  <TableHead className="text-right">
                    <SortableTableHead
                      label="Total"
                      columnKey="grandTotal"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                      className="justify-end"
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
                    colSpan={visibleColumnCount}
                    className="text-muted-foreground py-10 text-center text-sm"
                  >
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="py-10"
                  >
                    <TableStateMessage
                      variant="error"
                      message={error}
                      onRetry={() => {
                        setLoading(true);
                        setError(null);
                        fetchAdminOrders(query)
                          .then(result => setData(result))
                          .catch(err =>
                            setError(
                              (err as { message?: string })?.message || 'Failed to load orders',
                            ),
                          )
                          .finally(() => setLoading(false));
                      }}
                    />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="py-10"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No orders found."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map(item => (
                  <AdminOrdersListRow
                    key={item.id}
                    item={item}
                    isColumnVisible={isColumnVisible}
                  />
                ))
              )}
            </TableBody>
          </Table>

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
    </PermissionGuard>
  );
}

function AdminOrdersListRow({
  item,
  isColumnVisible,
}: {
  item: AdminOrderListItem;
  isColumnVisible: (id: string) => boolean;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="space-y-0.5">
          <div className="font-medium">{item.orderNumber}</div>
          <div className="text-muted-foreground text-xs">User #{item.userId}</div>
        </div>
      </TableCell>
      {isColumnVisible('customer') ? (
        <TableCell>
          <div className="space-y-0.5">
            <div className="font-medium">{item.customerName}</div>
            <div className="text-muted-foreground text-xs">{item.customerPhone}</div>
          </div>
        </TableCell>
      ) : null}
      {isColumnVisible('status') ? (
        <TableCell>
          <AdminOrderStatusBadge status={item.status} />
        </TableCell>
      ) : null}
      {isColumnVisible('payment') ? (
        <TableCell>
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">
              {item.paymentMethod}
            </div>
            <AdminOrderStatusBadge status={item.paymentStatus} />
          </div>
        </TableCell>
      ) : null}
      {isColumnVisible('items') ? <TableCell>{item.itemCount}</TableCell> : null}
      {isColumnVisible('placed') ? (
        <TableCell className="text-muted-foreground text-sm">
          {formatDateTime(item.placedAt)}
        </TableCell>
      ) : null}
      {isColumnVisible('total') ? (
        <TableCell className="text-right font-medium">
          {formatMoney(item.grandTotal, item.currency)}
        </TableCell>
      ) : null}
      <TableCell className="text-right">
        <div className="flex justify-end">
          <TableActionsMenu
            items={[
              {
                label: 'View Order',
                href: `/admin/orders/${item.id}`,
                icon: <Eye className="h-4 w-4" />,
              },
            ]}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

export default AdminOrdersListClient;
