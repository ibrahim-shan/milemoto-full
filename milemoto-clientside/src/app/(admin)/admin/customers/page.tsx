'use client';

import { useState } from 'react';

import { Edit, Eye, MoreHorizontal, Trash } from 'lucide-react';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { CustomerDetailDialog } from '@/features/admin/customers/customer-detail-dialog';
import { CustomerEditDialog } from '@/features/admin/customers/customer-edit-dialog';
import { CustomerFilters } from '@/features/admin/customers/customer-filters';
import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { Customer, useGetCustomers } from '@/hooks/useCustomerQueries';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { formatCurrency } from '@/lib/formatCurrency';
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
import { Avatar, AvatarFallback } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { ColumnVisibilityMenu } from '@/ui/column-visibility-menu';
import {
  DropdownMenu,
  DropdownMenuContent,  
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { StatusBadge } from '@/ui/status-badge';
import { SortDirection, SortableTableHead } from '@/ui/sortable-table-head';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

const CUSTOMER_COLUMNS = [
  { id: 'customer', label: 'Customer', alwaysVisible: true },
  { id: 'contact', label: 'Contact' },
  { id: 'registered', label: 'Registered' },
  { id: 'orders', label: 'Orders' },  
  { id: 'spent', label: 'Total Spent' },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Actions', alwaysVisible: true },
] as const;

export default function CustomersPage() {
  const columns = CUSTOMER_COLUMNS;

  // State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<
    'fullName' | 'email' | 'createdAt' | 'totalOrders' | 'totalSpent' | 'status' | undefined
  >(undefined);
  const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
  const [filters, setFilters] = useState<Record<string, string | number | boolean | string[] | undefined>>({
    filterMode: 'all',
    status: '',
    ordersMin: '',
    ordersMax: '',
    spentMin: '',
    spentMax: '',
    dateStart: '',
    dateEnd: '',
  });

  // Dialog state
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const { visibility: columnVisibility, setVisibility: setColumnVisibility } = useColumnVisibility(
    columns,
    'admin.customers.columns',
  );

  // Get default currency with position and decimals
  const { symbol: currencySymbol, position: currencyPosition, decimals } = useDefaultCurrency();

  // Queries
  const queryParams = {
    page,
    limit: pageSize,
    search,
    ...(filters.filterMode === 'any' ? { filterMode: 'any' as const } : {}),
    ...(filters.status ? { status: filters.status as 'active' | 'inactive' | 'blocked' } : {}),
    ...(filters.ordersMin ? { ordersMin: Number(filters.ordersMin) } : {}),
    ...(filters.ordersMax ? { ordersMax: Number(filters.ordersMax) } : {}),
    ...(filters.spentMin ? { spentMin: Number(filters.spentMin) } : {}),
    ...(filters.spentMax ? { spentMax: Number(filters.spentMax) } : {}),
    ...(filters.dateStart ? { dateStart: String(filters.dateStart) } : {}),
    ...(filters.dateEnd ? { dateEnd: String(filters.dateEnd) } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(sortBy && sortDir ? { sortDir } : {}),
  };

  const { data, isLoading, isError, refetch } = useGetCustomers(queryParams);

  // Handlers
  const handleViewCustomer = (customer: Customer) => {
    setViewingCustomer(customer);
    setIsDetailOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      // TODO: Implement delete mutation
      console.log('Deleting customer:', customerToDelete.id);
      setCustomerToDelete(null);
    }
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.split(' ');
    const first = parts[0];
    const second = parts[1];
    if (first && second) {
      return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
    }
    return fullName.charAt(0).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
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
    <PermissionGuard requiredPermission="customers.read">
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar area */}
          <div className="mb-6">
            <CustomerFilters
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

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                {isColumnVisible('customer') && (
                  <TableHead>
                    <SortableTableHead
                      label="Customer"
                      columnKey="fullName"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('contact') && (
                  <TableHead>
                    <SortableTableHead
                      label="Contact"
                      columnKey="email"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('registered') && (
                  <TableHead>
                    <SortableTableHead
                      label="Registered"
                      columnKey="createdAt"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('orders') && (
                  <TableHead>
                    <SortableTableHead
                      label="Orders"
                      columnKey="totalOrders"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('spent') && (
                  <TableHead>
                    <SortableTableHead
                      label="Total Spent"
                      columnKey="totalSpent"
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
                {isColumnVisible('actions') && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {isColumnVisible('customer') && (
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible('contact') && (
                      <TableCell>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible('registered') && (
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    )}
                    {isColumnVisible('orders') && (
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                    )}
                    {isColumnVisible('spent') && (
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    )}
                    {isColumnVisible('status') && (
                      <TableCell>
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </TableCell>
                    )}
                    {isColumnVisible('actions') && (
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
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
                      message="Failed to load customers. Please try again."
                      onRetry={refetch}
                    />
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="text-muted-foreground h-32 text-center"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No customers found."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map(customer => (
                  <TableRow key={customer.id}>
                    {isColumnVisible('customer') && (
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{getInitials(customer.fullName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{customer.fullName}</div>
                            <div className="text-muted-foreground text-sm">ID: {customer.id}</div>
                          </div>
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible('contact') && (
                      <TableCell>
                        <div>
                          <div className="text-sm">{customer.email}</div>
                          <div className="text-muted-foreground text-sm">
                            {customer.phone || '-'}
                          </div>
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible('registered') && (
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(customer.createdAt)}
                      </TableCell>
                    )}
                    {isColumnVisible('orders') && (
                      <TableCell className="text-sm">{customer.totalOrders || 0}</TableCell>
                    )}
                    {isColumnVisible('spent') && (
                      <TableCell className="font-medium">
                        {formatCurrency(
                          customer.totalSpent || 0,
                          currencySymbol,
                          currencyPosition as 'before' | 'after',
                          decimals,
                        )}
                      </TableCell>
                    )}
                    {isColumnVisible('status') && (
                      <TableCell>
                        <StatusBadge
                          variant={
                            customer.status === 'active'
                              ? 'success'
                              : customer.status === 'blocked'
                                ? 'error'
                                : 'neutral'
                          }
                        >
                          {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                        </StatusBadge>
                      </TableCell>
                    )}
                    {isColumnVisible('actions') && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              justify="center"
                            >
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(customer)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
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

          {/* Pagination */}
          {data && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-muted-foreground text-sm">
                Page {page} of {totalPages} (Total {totalCount} items)
              </div>
              <PaginationControls
                currentPage={page}
                totalCount={totalCount}
                pageSize={pageSize}
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

      {/* Customer Detail Dialog */}
      <CustomerDetailDialog
        customer={viewingCustomer}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />

      {/* Customer Edit Dialog */}
      <CustomerEditDialog
        customer={editingCustomer}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!customerToDelete}
        onOpenChange={open => !open && setCustomerToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the customer &quot;
              {customerToDelete?.fullName}&quot; and all associated data. This action cannot be
              undone.
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
    </PermissionGuard>
  );
}

