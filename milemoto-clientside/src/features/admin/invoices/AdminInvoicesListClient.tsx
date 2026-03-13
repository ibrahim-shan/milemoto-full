'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { Eye, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { InvoiceFilters } from '@/features/admin/invoices/invoice-filters';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { createAdminInvoiceFromOrder, fetchAdminInvoices } from '@/lib/admin-invoices';
import { fetchAdminOrders } from '@/lib/admin-orders';
import type { AdminInvoiceListItem, AdminInvoicesListQueryDto, AdminInvoicesListResponse } from '@/types';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { ColumnVisibilityMenu } from '@/ui/column-visibility-menu';
import { GeneralCombobox } from '@/ui/combobox';
import {
  Dialog, 
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import { Input } from '@/ui/input';
import { SortDirection, SortableTableHead } from '@/ui/sortable-table-head';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableActionsMenu } from '@/ui/table-actions-menu';
import { TablePaginationFooter } from '@/ui/table-pagination-footer';
import { TableStateMessage } from '@/ui/table-state-message';

const INVOICE_COLUMNS = [
  { id: 'invoice', label: 'Invoice', alwaysVisible: true },
  { id: 'order', label: 'Order' },
  { id: 'customer', label: 'Customer' },
  { id: 'status', label: 'Status' },
  { id: 'issuedAt', label: 'Issued At' },
  { id: 'total', label: 'Total' },
  { id: 'actions', label: 'Actions', alwaysVisible: true },
] as const;

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

function invoiceStatusVariant(
  status: AdminInvoiceListItem['status'],
): 'success' | 'warning' | 'neutral' | 'error' | 'info' {
  if (status === 'paid') return 'success';
  if (status === 'issued' || status === 'partially_paid') return 'warning';
  if (status === 'draft') return 'info';
  if (status === 'void') return 'error';
  return 'neutral';
}

export function AdminInvoicesListClient() {
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput.trim());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<
    'invoiceNumber' | 'orderNumber' | 'customerName' | 'status' | 'issuedAt' | 'grandTotal' | undefined
  >(undefined);
  const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
  const [filters, setFilters] = useState<Record<string, string | number | boolean | string[] | undefined>>({
    filterMode: 'all',
    status: '',
    dateFrom: '',
    dateTo: '',
  });
  const {
    visibility: columnVisibility,
    setVisibility: setColumnVisibility,
    isColumnVisible,
    visibleColumnCount,
  } = useColumnVisibility(INVOICE_COLUMNS, 'admin.invoices.columns');
  const [data, setData] = useState<AdminInvoicesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateOrderId, setGenerateOrderId] = useState<number | null>(null);
  const [generateOrderSearch, setGenerateOrderSearch] = useState('');
  const deferredGenerateOrderSearch = useDeferredValue(generateOrderSearch.trim());
  const [generateOrderOptions, setGenerateOrderOptions] = useState<
    { value: number; label: string; searchValue: string }[]
  >([]);
  const [generateOrderOptionsLoading, setGenerateOrderOptionsLoading] = useState(false);
  const [generateDueDate, setGenerateDueDate] = useState('');
  const [generateNote, setGenerateNote] = useState('');
  const [generateLoading, setGenerateLoading] = useState(false);

  const query = useMemo<Partial<AdminInvoicesListQueryDto>>(
    () => ({
      page,
      limit: pageSize,
      search: deferredSearch || undefined,
      ...(filters.filterMode === 'any' ? { filterMode: 'any' as const } : {}),
      ...(filters.status
        ? {
            status: filters.status as
              | 'draft'
              | 'issued'
              | 'paid'
              | 'partially_paid'
              | 'void',
          }
        : {}),
      ...(filters.dateFrom ? { dateFrom: String(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { dateTo: String(filters.dateTo) } : {}),
      sortBy: sortBy || undefined,
      sortDir: sortBy && sortDir ? sortDir : undefined,
    }),
    [deferredSearch, filters, page, pageSize, sortBy, sortDir],
  );

  const load = () => {
    setLoading(true);
    setError(null);
    fetchAdminInvoices(query)
      .then(result => setData(result))
      .catch(err => setError((err as { message?: string })?.message || 'Failed to load invoices'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!generateOpen) return;
    let cancelled = false;
    setGenerateOrderOptionsLoading(true);
    fetchAdminOrders({
      page: 1,
      limit: 20,
      search: deferredGenerateOrderSearch || undefined,
      sortBy: 'placedAt',
      sortDir: 'desc',
    })
      .then(result => {
        if (cancelled) return;
        const options = result.items.map(item => {
          const total = formatMoney(item.grandTotal, item.currency);
          return {
            value: item.id,
            label: `${item.orderNumber} - ${item.customerName}`,
            searchValue: `${item.orderNumber} ${item.customerName} ${item.customerPhone} ${total}`,
          };
        });
        setGenerateOrderOptions(options);
      })
      .catch(() => {
        if (!cancelled) {
          setGenerateOrderOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setGenerateOrderOptionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deferredGenerateOrderSearch, generateOpen]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAdminInvoices(query)
      .then(result => {
        if (!cancelled) setData(result);
      })
      .catch(err => {
        if (!cancelled) {
          setError((err as { message?: string })?.message || 'Failed to load invoices');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const handleSortChange = (nextSortBy?: string, nextSortDir?: SortDirection) => {
    setSortBy(nextSortBy as typeof sortBy);
    setSortDir(nextSortDir);
    setPage(1);
  };

  const handleGenerate = async () => {
    if (!generateOrderId || generateOrderId <= 0) {
      toast.error('Select an order');
      return;
    }

    try {
      setGenerateLoading(true);
      const created = await createAdminInvoiceFromOrder(generateOrderId, {
        ...(generateDueDate ? { dueDate: generateDueDate } : {}),
        ...(generateNote.trim() ? { note: generateNote.trim() } : {}),
      });
      toast.success(`Invoice ${created.invoiceNumber} is ready`);
      setGenerateOpen(false);
      setGenerateOrderId(null);
      setGenerateOrderSearch('');
      setGenerateOrderOptions([]);
      setGenerateDueDate('');
      setGenerateNote('');
      load();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to generate invoice');
    } finally {
      setGenerateLoading(false);
    }
  };

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <PermissionGuard requiredPermission="invoices.read">
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <InvoiceFilters
              filters={filters}
              onFilterChange={next => {
                setFilters(next);
                setPage(1);
              }}
              search={searchInput}
              onSearchChange={value => {
                setSearchInput(value);
                setPage(1);
              }}
              actions={
                <div className="flex items-center gap-2">
                  <ColumnVisibilityMenu
                    columns={INVOICE_COLUMNS}
                    visibility={columnVisibility}
                    onToggle={(columnId, visible) =>
                      setColumnVisibility(prev => ({ ...prev, [columnId]: visible }))
                    }
                  />
                  <Button
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => setGenerateOpen(true)}
                  >
                    Generate Invoice
                  </Button>
                </div>
              }
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableTableHead
                    label="Invoice"
                    columnKey="invoiceNumber"
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
                {isColumnVisible('issuedAt') ? (
                  <TableHead>
                    <SortableTableHead
                      label="Issued At"
                      columnKey="issuedAt"
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
                    Loading invoices...
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
                      onRetry={load}
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
                      message="No invoices found."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-medium">{item.invoiceNumber}</div>
                        <div className="text-muted-foreground text-xs">#{item.id}</div>
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
                        <StatusBadge variant={invoiceStatusVariant(item.status)}>
                          {item.status.replace(/_/g, ' ')}
                        </StatusBadge>
                      </TableCell>
                    ) : null}
                    {isColumnVisible('issuedAt') ? (
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateTime(item.issuedAt)}
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
                              label: 'View Invoice',
                              href: `/admin/invoices/${item.id}`,
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

      <Dialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
            <DialogDescription>Create one invoice from an existing order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="invoice-order-id"
                className="text-sm font-medium"
              >
                Order
              </label>
              <GeneralCombobox
                id="invoice-order-id"
                {...(generateOrderId !== null ? { value: generateOrderId } : {})}
                onChange={value => setGenerateOrderId(Number(value))}
                data={generateOrderOptions}
                searchValue={generateOrderSearch}
                onSearchChange={setGenerateOrderSearch}
                placeholder={generateOrderOptionsLoading ? 'Loading orders...' : 'Select order...'}
                emptyMessage={
                  generateOrderOptionsLoading ? 'Loading orders...' : 'No matching orders found.'
                }
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="invoice-due-date"
                className="text-sm font-medium"
              >
                Due Date (optional)
              </label>
              <Input
                id="invoice-due-date"
                type="date"
                value={generateDueDate}
                onChange={e => setGenerateDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="invoice-note"
                className="text-sm font-medium"
              >
                Note (optional)
              </label>
              <Input
                id="invoice-note"
                value={generateNote}
                onChange={e => setGenerateNote(e.target.value)}
                placeholder="Internal note..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGenerateOpen(false)}
              disabled={generateLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleGenerate()}
              disabled={generateLoading}
            >
              {generateLoading ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}

export default AdminInvoicesListClient;
