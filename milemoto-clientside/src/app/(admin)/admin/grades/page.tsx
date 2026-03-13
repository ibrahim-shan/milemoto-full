'use client';

import { useState } from 'react';

import { ClipboardCheck, Edit, MoreHorizontal, Plus, Trash } from 'lucide-react';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { GradeFilters } from '@/features/admin/grades/grade-filters';
import { GradeDialog } from '@/features/admin/grades/grade-dialog';
import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { Grade, useDeleteGrade, useGetGrades } from '@/hooks/useGradeQueries';
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
import { StatusBadge } from '@/ui/status-badge';
import type { SortDirection } from '@/ui/sortable-table-head';
import { SortableTableHead } from '@/ui/sortable-table-head';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

const GRADE_COLUMNS = [
  { id: 'name', label: 'Name', alwaysVisible: true },
  { id: 'description', label: 'Description' },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Actions', alwaysVisible: true },
] as const;

export default function GradesPage() {
  const columns = GRADE_COLUMNS;

  // State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<
    'name' | 'description' | 'status' | 'createdAt' | 'updatedAt' | undefined
  >(undefined);
  const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
  const [filters, setFilters] = useState<Record<string, string | number | boolean | string[] | undefined>>({
    filterMode: 'all',
    status: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);
  const { visibility: columnVisibility, setVisibility: setColumnVisibility } = useColumnVisibility(
    columns,
    'admin.grades.columns',
  );

  // Queries
  const { data, isLoading, isError, refetch } = useGetGrades({
    page,
    limit: pageSize,
    search,
    ...(filters.filterMode === 'any' ? { filterMode: 'any' as const } : {}),
    ...(filters.status ? { status: filters.status as 'active' | 'inactive' } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(sortBy && sortDir ? { sortDir } : {}),
  });

  const deleteMutation = useDeleteGrade();

  // Handlers
  const handleOpenAdd = () => {
    setEditingGrade(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (grade: Grade) => {
    setEditingGrade(grade);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (grade: Grade) => {
    setGradeToDelete(grade);
  };

  const confirmDelete = async () => {
    if (gradeToDelete) {
      await deleteMutation.mutateAsync(gradeToDelete.id);
      setGradeToDelete(null);
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

  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const handleSortChange = (nextSortBy?: string, nextSortDir?: SortDirection) => {
    setSortBy(nextSortBy as typeof sortBy);
    setSortDir(nextSortDir);
    setPage(1);
  };

  return (
    <PermissionGuard requiredPermission="grades.read">
      <Card>
        <CardHeader>
          <CardTitle>Grades</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar area */}
          <div className="mb-6">
            <GradeFilters
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
                    Add Grade
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
                      message="Failed to load grades. Please try again."
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
                      message="No grades found. Add one to get started."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map(grade => (
                  <TableRow key={grade.id}>
                    {isColumnVisible('name') && (
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="text-muted-foreground h-4 w-4" />
                          <div>{grade.name}</div>
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible('description') && (
                      <TableCell className="text-muted-foreground max-w-md truncate">
                        {grade.description}
                      </TableCell>
                    )}
                    {isColumnVisible('status') && (
                      <TableCell>
                        <StatusBadge variant={grade.status === 'active' ? 'success' : 'neutral'}>
                          {grade.status === 'active' ? 'Active' : 'Inactive'}
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
                            <DropdownMenuItem onClick={() => handleOpenEdit(grade)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(grade)}
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
          {data && totalCount > 0 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-muted-foreground text-sm">
                Page {page} of {totalPages} (Total {totalCount} items)
              </div>

              <PaginationControls
                currentPage={page}
                onPageChange={setPage}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageSizeChange={next => {
                  setPageSize(next);
                  setPage(1);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade Dialog */}
      <GradeDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        grade={editingGrade}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!gradeToDelete}
        onOpenChange={open => !open && setGradeToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the grade &quot;{gradeToDelete?.name}&quot;. This action
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


