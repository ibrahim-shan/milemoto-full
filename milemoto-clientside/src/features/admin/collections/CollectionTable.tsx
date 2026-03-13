'use client';

import { Edit, MoreHorizontal, SquareArrowOutUpLeft, Trash } from 'lucide-react';

import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import type { Collection } from '@/hooks/useCollectionQueries';
import { Button } from '@/ui/button';
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

type Props = {
  data?: { items: Collection[]; totalCount: number; page: number; limit: number } | undefined;
  isLoading: boolean;
  isError: boolean;
  onEdit: (collection: Collection) => void;
  onManage: (collection: Collection) => void;
  onDelete: (collection: Collection) => void;
  page: number;
  totalCount: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRetry?: () => void;
  isColumnVisible: (columnId: string) => boolean;
  visibleColumnCount: number;
  sortBy: 'name' | 'type' | 'matchType' | 'status' | 'createdAt' | undefined;
  sortDir: SortDirection | undefined;
  onSortChange: (nextSortBy?: string, nextSortDir?: SortDirection) => void;
};

export function CollectionTable({
  data,
  isLoading,
  isError,
  onEdit,
  onManage,
  onDelete,
  page,
  totalCount,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRetry,
  isColumnVisible,
  visibleColumnCount,
  sortBy,
  sortDir,
  onSortChange,
}: Props) {
  return (
    <>
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
                  onSortChange={onSortChange}
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
                  onSortChange={onSortChange}
                />
              </TableHead>
            )}
            {isColumnVisible('match') && (
              <TableHead>
                <SortableTableHead
                  label="Match"
                  columnKey="matchType"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSortChange={onSortChange}
                />
              </TableHead>
            )}
            {isColumnVisible('rules') && <TableHead>Rules</TableHead>}
            {isColumnVisible('status') && (
              <TableHead>
                <SortableTableHead
                  label="Status"
                  columnKey="status"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSortChange={onSortChange}
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
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                )}
                {isColumnVisible('type') && (
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                )}
                {isColumnVisible('match') && (
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                )}
                {isColumnVisible('rules') && (
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
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
                  message="Failed to load collections. Please try again."
                  {...(onRetry ? { onRetry } : {})}
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
                  message="No collections found. Create one to get started."
                />
              </TableCell>
            </TableRow>
          ) : (
            data?.items.map(col => (
              <TableRow key={col.id}>
                {isColumnVisible('name') && (
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{col.name}</span>
                      <code className="text-muted-foreground bg-muted mt-1 w-fit rounded px-1 text-xs">
                        {col.slug}
                      </code>
                    </div>
                  </TableCell>
                )}
                {isColumnVisible('type') && (
                  <TableCell className="capitalize">{col.type}</TableCell>
                )}
                {isColumnVisible('match') && (
                  <TableCell className="text-xs uppercase">{col.matchType}</TableCell>
                )}
                {isColumnVisible('rules') && <TableCell>{col.rules?.length ?? 0}</TableCell>}
                {isColumnVisible('status') && (
                  <TableCell>
                    <StatusBadge variant={col.status === 'active' ? 'success' : 'neutral'}>
                      {col.status === 'active' ? 'Active' : 'Inactive'}
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
                        <DropdownMenuItem onClick={() => onManage(col)}>
                          <SquareArrowOutUpLeft className="mr-2 h-4 w-4" />
                          Manage
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(col)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(col)}
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

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-muted-foreground text-sm">
            Page {page} of {totalPages} (Total {totalCount} items)
          </div>
          <PaginationControls
            currentPage={page}
            onPageChange={onPageChange}
            totalCount={totalCount}
            pageSize={pageSize}
            {...(onPageSizeChange ? { onPageSizeChange } : {})}
          />
        </div>
      )}
    </>
  );
}
