'use client';

import { useState } from 'react';

import { StateDialog } from './LocationDialogs';
import { LocationPagination } from './LocationPagination';
import { LocationToolbar } from './LocationToolbar';
import { StateResponse } from '@milemoto/types'; // <-- IMPORT STATE TYPE
import { Edit, MoreHorizontal, Trash } from 'lucide-react';

import { Skeleton } from '@/features/feedback/Skeleton';
import { useDebounce } from '@/hooks/useDebounce'; // Assumes you created this
import { useDeleteState, useGetStates } from '@/hooks/useLocationQueries';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

export function StatesTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StateResponse | null>(null); // <-- Use State type

  // --- State for Pagination and Search ---
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const limit = 10;

  // --- Data Fetching ---
  const { data, isLoading, isError, refetch } = useGetStates({
    search: debouncedSearch,
    page,
    limit,
  });
  const deleteMutation = useDeleteState();

  // --- Event Handlers ---
  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: StateResponse) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const [deleteTarget, setDeleteTarget] = useState<StateResponse | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = (item: StateResponse) => {
    setDeleteTarget(item);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
    setIsDeleteDialogOpen(false);
  };

  // --- Render Logic ---
  const states: StateResponse[] = data?.items ?? [];
  const totalCount = data?.totalCount || 0;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Handle Export/Import
  const handleExport = () => {
    const url = `${
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    }/api/v1/admin/locations/states/export`;
    window.open(url, '_blank');
  };

  const handleImport = () => {
    console.log('Import clicked. A file upload dialog should open.');
  };

  return (
    <div className="space-y-4">
      <LocationToolbar
        onAdd={handleOpenAdd}
        addLabel="Add State"
        searchPlaceholder="Search states or countries..."
        searchValue={search}
        onSearchChange={setSearch}
        onImport={handleImport}
        onExport={handleExport}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>State Name</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            // --- Loading State ---
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell>
                  <Skeleton className="h-5 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))
          ) : isError ? (
            // --- Error State ---
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-red-500"
              >
                <TableStateMessage
                  variant="error"
                  message="Failed to load states. Please try again."
                  onRetry={refetch}
                />
              </TableCell>
            </TableRow>
          ) : states.length === 0 ? (
            // --- Empty State ---
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-muted-foreground text-center"
              >
                <TableStateMessage
                  variant="empty"
                  message="No states found. Add one to get started."
                />
              </TableCell>
            </TableRow>
          ) : (
            // --- Success State ---
            states.map(item => {
              const effectiveActive = item.statusEffective === 'active';
              const overridden = item.status !== item.statusEffective;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.countryName}</TableCell>
                  <TableCell>
                    <div>
                      <StatusBadge variant={effectiveActive ? 'success' : 'neutral'}>
                        {effectiveActive ? 'Active' : 'Inactive'}
                      </StatusBadge>
                      {overridden && (
                        <span className="text-foreground/80 pl-2 text-xs">
                          Admin set: {item.status}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          justify="center"
                          aria-label={`Open actions menu for ${item.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(item)}
                          disabled={deleteMutation.isPending}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <LocationPagination
        totalCount={totalCount}
        currentPage={page}
        pageSize={limit}
        onPageChange={handlePageChange}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete State?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the state {deleteTarget?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StateDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        item={editingItem}
      />
    </div>
  );
}
