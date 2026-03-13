'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { Eye } from 'lucide-react';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { OrderRequestFilters } from '@/features/admin/orders/order-request-filters';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { fetchAdminOrderRequests } from '@/lib/admin-order-requests';
import type { AdminOrderRequestItem, AdminOrderRequestsListResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { ColumnVisibilityMenu } from '@/ui/column-visibility-menu';
import { SortDirection, SortableTableHead } from '@/ui/sortable-table-head';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableActionsMenu } from '@/ui/table-actions-menu';
import { TablePaginationFooter } from '@/ui/table-pagination-footer';
import { TableStateMessage } from '@/ui/table-state-message';

const REQUEST_COLUMNS = [
  { id: 'request', label: 'Request', alwaysVisible: true },
  { id: 'order', label: 'Order' },
  { id: 'customer', label: 'Customer' },
  { id: 'status', label: 'Status' },
  { id: 'requestedAt', label: 'Requested At' },
  { id: 'actions', label: 'Actions', alwaysVisible: true },
] as const;

type RequestTypeFilter = 'all' | 'cancel' | 'return' | 'refund';
type RequestStatusFilter =
  | 'all'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled_by_user';

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatRequestType(type: AdminOrderRequestItem['type']) {
  if (type === 'cancel') return 'Cancellation';
  if (type === 'return') return 'Return';
  return 'Refund';
}

function requestStatusVariant(status: AdminOrderRequestItem['status']) {
  if (status === 'pending') return 'warning';
  if (status === 'approved') return 'info';
  if (status === 'completed') return 'success';
  if (status === 'rejected') return 'error';
  return 'neutral';
}

export function AdminOrderRequestsListClient() {
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput.trim());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<
    'id' | 'orderNumber' | 'customerName' | 'status' | 'requestedAt' | undefined
  >(undefined);
  const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
  const {
    visibility: columnVisibility,
    setVisibility: setColumnVisibility,
    isColumnVisible,
    visibleColumnCount,
  } = useColumnVisibility(REQUEST_COLUMNS, 'admin.order-requests.columns');
  const [filters, setFilters] = useState<Record<string, string | number | boolean | string[] | undefined>>({
    filterMode: 'all',
    type: '',
    status: '',
    onlyRequiresStockAction: false,
    onlyRefundPendingCompletion: false,
  });
  const [data, setData] = useState<AdminOrderRequestsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: deferredSearch || undefined,
      ...(filters.filterMode === 'any' ? { filterMode: 'any' as const } : {}),
      type: filters.type ? (filters.type as Exclude<RequestTypeFilter, 'all'>) : undefined,
      status: filters.status
        ? (filters.status as Exclude<RequestStatusFilter, 'all'>)
        : undefined,
      ...(filters.onlyRequiresStockAction === true ? { onlyRequiresStockAction: true } : {}),
      ...(filters.onlyRefundPendingCompletion === true
        ? { onlyRefundPendingCompletion: true }
        : {}),
      sortBy: sortBy || undefined,
      sortDir: sortBy && sortDir ? sortDir : undefined,
    }),
    [
      deferredSearch,
      filters.filterMode,
      filters.onlyRefundPendingCompletion,
      filters.onlyRequiresStockAction,
      filters.status,
      filters.type,
      page,
      pageSize,
      sortBy,
      sortDir,
    ],
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

    fetchAdminOrderRequests(query)
      .then(result => {
        if (!cancelled) setData(result);
      })
      .catch(err => {
        if (!cancelled) {
          setError((err as { message?: string })?.message || 'Failed to load order requests');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <PermissionGuard requiredPermission="orders.read">
      <Card>
        <CardHeader>
          <CardTitle>Order Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <OrderRequestFilters
              filters={filters}
              onFilterChange={nextFilters => {
                setFilters(nextFilters);
                setPage(1);
              }}
              search={searchInput}
              onSearchChange={value => {
                setSearchInput(value);
                setPage(1);
              }}
              actions={
                <ColumnVisibilityMenu
                  columns={REQUEST_COLUMNS}
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
                <TableHead>
                  <SortableTableHead
                    label="Request"
                    columnKey="id"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSortChange={handleSortChange}
                  />
                </TableHead>
                {isColumnVisible('order') ? (
                  <TableHead>
                    <SortableTableHead
                      label="Order"
                      columnKey="orderNumber"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                ) : null}
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
                {isColumnVisible('requestedAt') ? (
                  <TableHead>
                    <SortableTableHead
                      label="Requested At"
                      columnKey="requestedAt"
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
                    colSpan={visibleColumnCount}
                    className="text-muted-foreground py-10 text-center text-sm"
                  >
                    Loading order requests...
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
                      message="No order requests found."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-medium">#{item.id}</div>
                        <div className="text-muted-foreground text-xs">
                          {formatRequestType(item.type)}
                        </div>
                      </div>
                    </TableCell>
                    {isColumnVisible('order') ? (
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium">{item.orderNumber}</div>
                          <div className="text-muted-foreground text-xs">Order #{item.orderId}</div>
                        </div>
                      </TableCell>
                    ) : null}
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
                        <StatusBadge variant={requestStatusVariant(item.status)}>
                          {item.status.replace(/_/g, ' ')}
                        </StatusBadge>
                      </TableCell>
                    ) : null}
                    {isColumnVisible('requestedAt') ? (
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateTime(item.requestedAt)}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <TableActionsMenu
                          items={[
                            {
                              label: 'View Request',
                              href: `/admin/order-requests/${item.id}`,
                              icon: <Eye className="h-4 w-4" />,
                            },
                          ]}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
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

export default AdminOrderRequestsListClient;

