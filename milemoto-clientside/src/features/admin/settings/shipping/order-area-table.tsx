'use client';

import { useState } from 'react';

import { OrderAreaDialog } from './order-area-dialog';
import { Edit, MoreHorizontal, Plus, Search, Trash } from 'lucide-react';

import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import { useDebounce } from '@/hooks/useDebounce';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import {
  useDeleteAreaRate,
  useGetAreaRates,
  type ShippingAreaRate,
} from '@/hooks/useShippingQueries';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

export function OrderAreaTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const limit = 5;

  // Get default currency with position and decimals
  const { formatCurrency } = useDefaultCurrency();

  // Queries
  const { data, isLoading, isError, refetch } = useGetAreaRates({
    search: debouncedSearch,
    page,
    limit,
  });
  const deleteMutation = useDeleteAreaRate();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<ShippingAreaRate | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<ShippingAreaRate | null>(null);

  const handleOpenAdd = () => {
    setEditingArea(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (area: ShippingAreaRate) => {
    setEditingArea(area);
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    if (areaToDelete) {
      deleteMutation.mutate(areaToDelete.id);
      setAreaToDelete(null);
    }
  };

  const areas = data?.items ?? [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Order Area</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <label
                htmlFor="order-area-search"
                className="sr-only"
              >
                Search order areas
              </label>
              <Search
                className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4"
                aria-hidden="true"
              />

              <Input
                id="order-area-search"
                type="search"
                placeholder="Search areas..."
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
              leftIcon={
                <Plus
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              }
              onClick={handleOpenAdd}
            >
              Add Order Area
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead>State</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Shipping Cost</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-10" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-4 text-center text-red-500"
                  >
                    <TableStateMessage
                      variant="error"
                      message="Failed to load areas."
                      onRetry={refetch}
                    />
                  </TableCell>
                </TableRow>
              ) : areas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-4 text-center"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No areas found."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                areas.map(area => (
                  <TableRow key={area.id}>
                    <TableCell>{area.countryName}</TableCell>
                    <TableCell>
                      {area.stateName || <span className="text-muted-foreground">All States</span>}
                    </TableCell>
                    <TableCell>
                      {area.cityName || <span className="text-muted-foreground">All Cities</span>}
                    </TableCell>
                    <TableCell>{formatCurrency(area.cost)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-label={`Open actions menu for ${area.countryName}`}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            justify="center"
                          >
                            <MoreHorizontal
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(area)}>
                            <Edit
                              className="mr-2 h-4 w-4"
                              aria-hidden="true"
                            />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setAreaToDelete(area)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash
                              className="mr-2 h-4 w-4"
                              aria-hidden="true"
                            />
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
              Page {page} of {totalPages || 1} (Total {totalCount} items)
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

      {/* Modals */}
      <OrderAreaDialog
        key={editingArea?.id ?? 'new'}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        area={editingArea}
      />

      <AlertDialog
        open={!!areaToDelete}
        onOpenChange={open => !open && setAreaToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Area Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the rule for {areaToDelete?.countryName}.
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
