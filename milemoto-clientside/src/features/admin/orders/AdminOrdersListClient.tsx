'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { AdminOrderStatusBadge, formatAdminOrderStatus } from './order-status';
import { Eye } from 'lucide-react';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { fetchAdminOrders } from '@/lib/admin-orders';
import type { AdminOrderListItem, AdminOrdersListResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { ColumnVisibilityMenu } from '@/ui/column-visibility-menu';
import { Input } from '@/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
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

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending_confirmation', label: formatAdminOrderStatus('pending_confirmation') },
  { value: 'confirmed', label: formatAdminOrderStatus('confirmed') },
  { value: 'processing', label: formatAdminOrderStatus('processing') },
  { value: 'shipped', label: formatAdminOrderStatus('shipped') },
  { value: 'delivered', label: formatAdminOrderStatus('delivered') },
  { value: 'cancelled', label: formatAdminOrderStatus('cancelled') },
];

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
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    customer: true,
    status: true,
    payment: true,
    items: true,
    placed: true,
    total: true,
  });
  const [data, setData] = useState<AdminOrdersListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination when filters change
    setPage(1);
  }, [deferredSearch, status]);

  const query = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: deferredSearch || undefined,
      status: status === 'all' ? undefined : status,
    }),
    [deferredSearch, page, pageSize, status],
  );

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting request UI state before starting fetch
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

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const isColumnVisible = (id: string) => columnVisibility[id] !== false;
  const visibleColumnCount = ORDER_COLUMNS.filter(
    col => ('alwaysVisible' in col && col.alwaysVisible) || isColumnVisible(col.id),
  ).length;

  return (
    <PermissionGuard requiredPermission="orders.read">
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
              <div className="w-full md:max-w-sm">
                <Input
                  placeholder="Search by order #, customer, phone"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                />
              </div>
              <div className="w-full md:w-56">
                <Select
                  value={status}
                  onValueChange={setStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(option => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <ColumnVisibilityMenu
                columns={ORDER_COLUMNS}
                visibility={columnVisibility}
                onToggle={(columnId, visible) =>
                  setColumnVisibility(prev => ({ ...prev, [columnId]: visible }))
                }
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                {isColumnVisible('customer') ? <TableHead>Customer</TableHead> : null}
                {isColumnVisible('status') ? <TableHead>Status</TableHead> : null}
                {isColumnVisible('payment') ? <TableHead>Payment</TableHead> : null}
                {isColumnVisible('items') ? <TableHead>Items</TableHead> : null}
                {isColumnVisible('placed') ? <TableHead>Placed</TableHead> : null}
                {isColumnVisible('total') ? (
                  <TableHead className="text-right">Total</TableHead>
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
