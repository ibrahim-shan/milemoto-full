'use client';

import { useState } from 'react';

import { Plus, Search } from 'lucide-react';

import { CollectionDialog } from '@/features/admin/collections/CollectionDialog';
import { CollectionTable } from '@/features/admin/collections/CollectionTable';
import { ManageCollectionDrawer } from '@/features/admin/collections/ManageCollectionDrawer';
import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { Collection, useDeleteCollection, useGetCollections } from '@/hooks/useCollectionQueries';
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
import { FilterConfig, GenericFilter } from '@/ui/generic-filter';
import { Input } from '@/ui/input';

export default function CollectionsPage() {
  const columns = [
    { id: 'name', label: 'Name' },
    { id: 'type', label: 'Type' },
    { id: 'match', label: 'Match' },
    { id: 'rules', label: 'Rules' },
    { id: 'status', label: 'Status' },
    { id: 'actions', label: 'Actions', alwaysVisible: true },
  ];

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string | number | string[] | undefined>>(
    {},
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [toDelete, setToDelete] = useState<Collection | null>(null);
  const [selected, setSelected] = useState<Collection | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(columns.map(column => [column.id, true])),
  );
  const listParams = {
    page,
    limit: pageSize,
    search,
    ...(filters.type ? { type: filters.type as 'manual' | 'automatic' } : {}),
    ...(filters.status ? { status: filters.status as 'active' | 'inactive' } : {}),
  } as const;

  const { data, isLoading, isError, refetch } = useGetCollections(listParams);

  const deleteMutation = useDeleteCollection();

  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const isColumnVisible = (id: string) => {
    const column = columns.find(item => item.id === id);
    if (column?.alwaysVisible) return true;
    return columnVisibility[id] !== false;
  };

  const visibleColumnCount = columns.reduce(
    (count, column) => count + (isColumnVisible(column.id) ? 1 : 0),
    0,
  );

  const filterConfig: FilterConfig[] = [
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Automatic', value: 'automatic' },
      ],
    },
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

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (col: Collection) => {
    setEditing(col);
    setIsModalOpen(true);
  };

  const openManage = (col: Collection) => {
    setSelected(col);
  };

  const confirmDelete = async () => {
    if (toDelete) {
      await deleteMutation.mutateAsync(toDelete.id);
      setToDelete(null);
    }
  };

  return (
    <PermissionGuard requiredPermission="collections.read">
      <Card>
        <CardHeader>
          <CardTitle>Collections</CardTitle>
        </CardHeader>
        <CardContent>
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
                    placeholder="Search collections..."
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
                    onClick={openCreate}
                  >
                    Add Collection
                  </Button>
                </div>
              }
            />
          </div>

          <CollectionTable
            data={data}
            isLoading={isLoading}
            isError={isError}
            onEdit={openEdit}
            onManage={openManage}
            onDelete={setToDelete}
            onRetry={refetch}
            page={page}
            totalCount={totalCount}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            isColumnVisible={isColumnVisible}
            visibleColumnCount={visibleColumnCount}
            onPageSizeChange={next => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      <CollectionDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        collection={editing}
      />

      <AlertDialog
        open={!!toDelete}
        onOpenChange={open => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &quot;{toDelete?.name}&quot;. Products will no longer be part of this
              collection.
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

      <ManageCollectionDrawer
        collection={selected}
        onClose={() => setSelected(null)}
      />
    </PermissionGuard>
  );
}
