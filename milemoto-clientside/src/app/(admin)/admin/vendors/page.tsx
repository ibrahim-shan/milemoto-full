'use client';

import { useMemo, useState } from 'react';

import { Edit, Globe, Link, Mail, MoreHorizontal, Phone, Plus, Trash } from 'lucide-react';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { VendorDialog } from '@/features/admin/vendors/vendor-dialog';
import { VendorsFilters } from '@/features/admin/vendors/vendors-filters';
import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useDeleteVendor, useGetVendors, type Vendor } from '@/hooks/useVendorQueries';
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

const VENDOR_COLUMNS = [
  { id: 'name', label: 'Name', alwaysVisible: true },
  { id: 'contact', label: 'Contact Info' },
  { id: 'location', label: 'Location' },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Actions', alwaysVisible: true },
] as const;

export default function VendorsPage() {
  const columns = VENDOR_COLUMNS;

  // State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'country' | 'status' | 'email' | undefined>(
    undefined,
  );
  const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [filters, setFilters] = useState<Record<string, string | number | boolean | string[] | undefined>>({
    filterMode: 'all',
    status: '',
    country: [],
  });
  const { visibility: columnVisibility, setVisibility: setColumnVisibility } = useColumnVisibility(
    columns,
    'admin.vendors.columns',
  );

  const { data: locationData } = useGetVendors({
    page: 1,
    limit: 100,
  });

  // Queries
  const { data, isLoading, isError, refetch } = useGetVendors({
    page,
    limit: pageSize,
    search,
    ...(filters.status ? { status: filters.status as 'active' | 'inactive' } : {}),
    ...(filters.country && (filters.country as string[]).length > 0
      ? { country: filters.country as string[] }
      : {}),
    ...(filters.filterMode === 'any' ? { filterMode: 'any' as const } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(sortBy && sortDir ? { sortDir } : {}),
  });

  const locationOptions = useMemo(() => {
    const items =
      locationData?.items && locationData.items.length > 0
        ? locationData.items
        : (data?.items ?? []);
    const unique = new Map<string, string>();
    for (const vendor of items) {
      const country = vendor.country?.trim();
      if (country) {
        unique.set(country, country);
      }
    }
    return Array.from(unique.values())
      .sort((a, b) => a.localeCompare(b))
      .map(country => ({ label: country, value: country }));
  }, [data, locationData]);

  const deleteMutation = useDeleteVendor();

  // Handlers
  const handleOpenAdd = () => {
    setEditingVendor(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (vendor: Vendor) => {
    setVendorToDelete(vendor);
  };

  const confirmDelete = async () => {
    if (vendorToDelete) {
      await deleteMutation.mutateAsync(vendorToDelete.id);
      setVendorToDelete(null);
    }
  };

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

  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <PermissionGuard requiredPermission="vendors.read">
      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar area */}
          <div className="mb-6">
            <VendorsFilters
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
              locationOptions={locationOptions}
              actions={
                <div className="flex items-center gap-2">
                  <ColumnVisibilityMenu
                    columns={columns}
                    visibility={columnVisibility}
                    onToggle={(columnId, visible) =>
                      setColumnVisibility(prev => ({ ...prev, [columnId]: visible }))
                    }
                  />
                  <Button
                    variant="solid"
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={handleOpenAdd}
                  >
                    Add Vendor
                  </Button>
                </div>
              }
            />
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                {isColumnVisible('name') && (
                  <TableHead>
                    <SortableTableHead
                      label="Name"
                      columnKey="name"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('contact') && (
                  <TableHead>
                    <SortableTableHead
                      label="Contact Info"
                      columnKey="email"
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
                      columnKey="country"
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
                    {isColumnVisible('name') && (
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                    )}
                    {isColumnVisible('contact') && (
                      <TableCell>
                        <Skeleton className="h-5 w-48" />
                      </TableCell>
                    )}
                    {isColumnVisible('location') && (
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                    )}
                    {isColumnVisible('status') && (
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
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
                      message="Failed to load vendors. Please try again."
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
                      message="No vendors found. Add one to get started."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map(vendor => (
                  <TableRow key={vendor.id}>
                    {isColumnVisible('name') && (
                      <TableCell className="font-medium">
                        <div>{vendor.name}</div>
                      </TableCell>
                    )}
                    {isColumnVisible('contact') && (
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {vendor.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="text-muted-foreground h-3 w-3" />
                              <span>{vendor.email}</span>
                            </div>
                          )}
                          {vendor.phoneNumber && (
                            <div className="flex items-center gap-2">
                              <Phone className="text-muted-foreground h-3 w-3" />
                              <span>{vendor.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible('location') && (
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Globe className="text-muted-foreground h-3 w-3" />
                            <span>{vendor.country}</span>
                          </div>
                          {vendor.address && (
                            <div className="text-muted-foreground text-xs">{vendor.address}</div>
                          )}
                          {vendor.website && (
                            <div className="flex items-center gap-2">
                              <Link className="text-muted-foreground h-3 w-3" />
                              <a
                                href={vendor.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-primary text-xs"
                              >
                                {vendor.website}
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible('status') && (
                      <TableCell>
                        <StatusBadge variant={vendor.status === 'active' ? 'success' : 'neutral'}>
                          {vendor.status === 'active' ? 'Active' : 'Inactive'}
                        </StatusBadge>
                      </TableCell>
                    )}
                    {isColumnVisible('actions') && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              justify="center"
                              className="h-8 w-8 p-0"
                            >
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(vendor)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(vendor)}
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

      {/* Vendor Dialog */}
      <VendorDialog
        key={editingVendor?.id ?? 'new'}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        vendor={editingVendor}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!vendorToDelete}
        onOpenChange={open => !open && setVendorToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the vendor &quot;{vendorToDelete?.name}&quot;. This
              action cannot be undone.
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


