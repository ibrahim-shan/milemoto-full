'use client';

import React, { useState } from 'react';

import { Edit, MoreHorizontal, Plus, Search, Trash } from 'lucide-react';

import { UnitDialog } from '@/features/admin/settings/units/unit-dialog';
import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
// Hooks & Utils
import { useDebounce } from '@/hooks/useDebounce';
import { useDeleteUnitGroup, useGetUnitGroups, type UnitGroup } from '@/hooks/useUnitQueries';
// UI Components
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Input } from '@/ui/input';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

export default function UnitsPage() {
  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitGroup | null>(null);

  // Alert Dialog State
  const [unitToDelete, setUnitToDelete] = useState<UnitGroup | null>(null);

  const limit = 10;

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useGetUnitGroups({
    search: debouncedSearch,
    page,
    limit,
  });

  const deleteMutation = useDeleteUnitGroup();

  // Handlers
  const handleOpenAdd = () => {
    setEditingUnit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: UnitGroup) => {
    setEditingUnit(item);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (unit: UnitGroup) => {
    setUnitToDelete(unit);
  };

  const confirmDelete = () => {
    if (unitToDelete) {
      deleteMutation.mutate(unitToDelete.id);
      setUnitToDelete(null);
    }
  };

  const units = data?.items ?? [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Unit Groups</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar area */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder="Search unit groups..."
                className="pl-9"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Button
              variant="solid"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenAdd}
            >
              Add Unit Group
            </Button>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group Name</TableHead>
                <TableHead>Values</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-red-500"
                  >
                    <TableStateMessage
                      variant="error"
                      message="Failed to load units. Please try again."
                      onRetry={refetch}
                    />
                  </TableCell>
                </TableRow>
              ) : units.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground h-32 text-center"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No unit groups found. Add one to get started."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                units.map(unit => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {unit.values?.map(v => v.code).join(', ') || '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={unit.status === 'active' ? 'success' : 'neutral'}>
                        {unit.status === 'active' ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Open menu"
                            justify="center"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(unit)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(unit)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Reusable Pagination Component */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-muted-foreground text-sm">
              Page {page} of {totalPages} (Total {totalCount} items)
            </div>

            <PaginationControls
              totalCount={totalCount}
              pageSize={limit}
              currentPage={page}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <UnitDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        unitGroup={editingUnit}
      />

      {/* Delete Alert Dialog */}
      <AlertDialog
        open={!!unitToDelete}
        onOpenChange={open => !open && setUnitToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the unit group
              <span className="text-foreground font-semibold"> {unitToDelete?.name} </span>
              and remove it from the server.
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
    </>
  );
}
