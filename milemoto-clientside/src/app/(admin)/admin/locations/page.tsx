'use client';

import { useState } from 'react';

import { Edit, MapPin, MoreHorizontal, Plus, Trash } from 'lucide-react';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { LocationDialog } from '@/features/admin/locations/location-dialog';
import { LocationsFilters } from '@/features/admin/locations/locations-filters';
import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import {
  StockLocation,
  useDeleteStockLocation,
  useGetStockLocations,
} from '@/hooks/useStockLocationQueries';
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

const STOCK_LOCATION_COLUMNS = [
  { id: 'name', label: 'Location Name', alwaysVisible: true },
  { id: 'type', label: 'Type' },
  { id: 'description', label: 'Description' },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Actions', alwaysVisible: true },
] as const;

export default function LocationsPage() {
  const columns = STOCK_LOCATION_COLUMNS;

  // State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<
    'name' | 'type' | 'status' | 'description' | 'createdAt' | 'updatedAt' | undefined
  >(undefined);
  const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
  const [filters, setFilters] = useState<
    Record<string, string | number | boolean | string[] | undefined>
  >({
    filterMode: 'all',
    status: '',
    type: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StockLocation | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<StockLocation | null>(null);
  const { visibility: columnVisibility, setVisibility: setColumnVisibility } = useColumnVisibility(
    columns,
    'admin.stock-locations.columns',
  );

  // Queries
  const { data, isLoading, isError, refetch } = useGetStockLocations({
    page,
    limit: pageSize,
    search,
    ...(filters.status ? { status: filters.status as 'active' | 'inactive' } : {}),
    ...(filters.type
      ? { type: filters.type as 'Warehouse' | 'Store' | 'Office' | 'Factory' | 'Others' }
      : {}),
    ...(filters.filterMode === 'any' ? { filterMode: 'any' as const } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(sortBy && sortDir ? { sortDir } : {}),
  });

  const deleteMutation = useDeleteStockLocation();

  // Handlers
  const handleOpenAdd = () => {
    setEditingLocation(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (location: StockLocation) => {
    setEditingLocation(location);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (location: StockLocation) => {
    setLocationToDelete(location);
  };

  const confirmDelete = async () => {
    if (locationToDelete) {
      await deleteMutation.mutateAsync(locationToDelete.id);
      setLocationToDelete(null);
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

  return (
    <PermissionGuard requiredPermission="locations.read">
      <Card>
        <CardHeader>
          <CardTitle>Stock Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <LocationsFilters
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
                    Add Location
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
                      label="Location Name"
                      columnKey="name"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('type') && (
                  <TableHead>
                    <SortableTableHead
                      label="Type"
                      columnKey="type"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSortChange={handleSortChange}
                    />
                  </TableHead>
                )}
                {isColumnVisible('description') && (
                  <TableHead>
                    <SortableTableHead
                      label="Description"
                      columnKey="description"
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
                    {isColumnVisible('type') && (
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    )}
                    {isColumnVisible('description') && (
                      <TableCell>
                        <Skeleton className="h-5 w-48" />
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
                      message="Failed to load locations. Please try again."
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
                      message="No locations found. Add one to get started."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map(location => (
                  <TableRow key={location.id}>
                    {isColumnVisible('name') && (
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="text-muted-foreground h-4 w-4" />
                          <div>{location.name}</div>
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible('type') && (
                      <TableCell>
                        <StatusBadge variant="neutral">{location.type}</StatusBadge>
                      </TableCell>
                    )}
                    {isColumnVisible('description') && (
                      <TableCell className="text-muted-foreground max-w-md truncate">
                        {location.description}
                      </TableCell>
                    )}
                    {isColumnVisible('status') && (
                      <TableCell>
                        <StatusBadge variant={location.status === 'active' ? 'success' : 'neutral'}>
                          {location.status === 'active' ? 'Active' : 'Inactive'}
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
                            <DropdownMenuItem onClick={() => handleOpenEdit(location)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(location)}
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
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-muted-foreground text-sm">
                Page {page} of {data.totalPages} (Total {data.total} items)
              </div>

              <PaginationControls
                currentPage={page}
                totalCount={data.total}
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

      {/* Location Dialog */}
      <LocationDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        location={editingLocation}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!locationToDelete}
        onOpenChange={open => !open && setLocationToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the location &quot;{locationToDelete?.name}&quot;. This
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

