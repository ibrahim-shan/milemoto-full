'use client';

import { useState } from 'react';

import { Edit, MoreHorizontal, Plus, Search, Tag, Trash } from 'lucide-react';

import { BrandDialog } from '@/features/admin/brands/brand-dialog';
import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import { Brand, useDeleteBrand, useGetBrands } from '@/hooks/useBrandQueries';
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
import { FilterConfig, GenericFilter } from '@/ui/generic-filter';
import { Input } from '@/ui/input';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

export default function BrandsPage() {
  const columns = [
    { id: 'name', label: 'Name' },
    { id: 'slug', label: 'Slug' },
    { id: 'description', label: 'Description' },
    { id: 'status', label: 'Status' },
    { id: 'actions', label: 'Actions', alwaysVisible: true },
  ];

  // State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string | number | string[] | undefined>>({
    status: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(columns.map(column => [column.id, true])),
  );

  // Queries
  const { data, isLoading, isError, refetch } = useGetBrands({
    page,
    limit: pageSize,
    search,
    ...(filters.status ? { status: filters.status as 'active' | 'inactive' } : {}),
  });

  const deleteMutation = useDeleteBrand();

  // Handlers
  const handleOpenAdd = () => {
    setEditingBrand(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (brand: Brand) => {
    setBrandToDelete(brand);
  };

  const confirmDelete = async () => {
    if (brandToDelete) {
      await deleteMutation.mutateAsync(brandToDelete.id);
      setBrandToDelete(null);
    }
  };

  const isColumnVisible = (id: string) => {
    const column = columns.find(item => item.id === id);
    if (column?.alwaysVisible) return true;
    return columnVisibility[id] !== false;
  };

  const visibleColumnCount = columns.reduce(
    (count, column) => count + (isColumnVisible(column.id) ? 1 : 0),
    0,
  );

  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const filterConfig: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  ];

  return (
    <PermissionGuard requiredPermission="brands.read">
      <Card>
        <CardHeader>
          <CardTitle>Brands</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar area */}
          <div className="mb-6">
            <GenericFilter
              config={filterConfig}
              filters={filters}
              onFilterChange={nextFilters => {
                setFilters(nextFilters);
                setPage(1);
              }}
              search={
                <div className="relative max-w-sm flex-1">
                  <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
                  <Input
                    placeholder="Search brands..."
                    className="pl-9"
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              }
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
                    Add Brand
                  </Button>
                </div>
              }
            />
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                {isColumnVisible('name') && <TableHead>Name</TableHead>}
                {isColumnVisible('slug') && <TableHead>Slug</TableHead>}
                {isColumnVisible('description') && <TableHead>Description</TableHead>}
                {isColumnVisible('status') && <TableHead>Status</TableHead>}
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
                    {isColumnVisible('slug') && (
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
                      message="Failed to load brands. Please try again."
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
                      message="No brands found. Add one to get started."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map(brand => (
                  <TableRow key={brand.id}>
                    {isColumnVisible('name') && (
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Tag className="text-muted-foreground h-4 w-4" />
                          <div>{brand.name}</div>
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible('slug') && (
                      <TableCell>
                        <code className="bg-muted rounded px-2 py-1 text-xs">{brand.slug}</code>
                      </TableCell>
                    )}
                    {isColumnVisible('description') && (
                      <TableCell className="text-muted-foreground max-w-md truncate">
                        {brand.description}
                      </TableCell>
                    )}
                    {isColumnVisible('status') && (
                      <TableCell>
                        <StatusBadge variant={brand.status === 'active' ? 'success' : 'neutral'}>
                          {brand.status === 'active' ? 'Active' : 'Inactive'}
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
                            <DropdownMenuItem onClick={() => handleOpenEdit(brand)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(brand)}
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

      {/* Brand Dialog */}
      <BrandDialog
        key={editingBrand?.id ?? 'new'}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        brand={editingBrand}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!brandToDelete}
        onOpenChange={open => !open && setBrandToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the brand &quot;{brandToDelete?.name}&quot;. This action
              cannot be undone.
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
