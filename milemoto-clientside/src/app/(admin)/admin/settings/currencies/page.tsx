'use client';

import { useMemo, useState } from 'react';

import { Edit, MoreHorizontal, Plus, Search, Trash } from 'lucide-react';

import { CurrencyDialog } from '@/features/admin/settings/currencies/currency-dialog';
import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import {
  useDeleteCurrency,
  useGetCurrencies,
  useUpdateCurrency,
  type Currency,
} from '@/hooks/useCurrencyQueries';
// Hooks & Utils
import { useDebounce } from '@/hooks/useDebounce';
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
// UI Components
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
import { Switch } from '@/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

export default function CurrenciesPage() {
  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  // Toggle to show inactive currencies in list
  const [showInactive, setShowInactive] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);

  // Alert Dialog State
  const [pendingAction, setPendingAction] = useState<{
    currency: Currency;
    action: 'activate' | 'delete';
  } | null>(null);

  const limit = 10;

  const statusFilter = useMemo(
    () => (showInactive ? undefined : ('active' as const)),
    [showInactive],
  );

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useGetCurrencies({
    search: debouncedSearch,
    page,
    limit,
    status: statusFilter,
  });

  const deleteMutation = useDeleteCurrency();
  const updateMutation = useUpdateCurrency();

  // Handlers
  const handleOpenAdd = () => {
    setEditingCurrency(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Currency) => {
    setEditingCurrency(item);
    setIsModalOpen(true);
  };

  const handleActionClick = (currency: Currency, action: 'activate' | 'delete') => {
    setPendingAction({ currency, action });
  };

  const confirmAction = () => {
    if (!pendingAction) return;
    const { currency, action } = pendingAction;
    if (action === 'delete') {
      deleteMutation.mutate(currency.id);
    } else {
      updateMutation.mutate({ id: currency.id, status: 'active' });
    }
    setPendingAction(null);
  };

  const currencies = data?.items ?? [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Currencies</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar area */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder="Search currencies..."
                className="pl-9"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="toggle-inactive"
                checked={showInactive}
                onCheckedChange={checked => {
                  setShowInactive(checked);
                  setPage(1);
                }}
                aria-label="Show inactive currencies"
              />
              <label
                htmlFor="toggle-inactive"
                className="text-muted-foreground text-sm"
              >
                Show inactive
              </label>
            </div>

            <Button
              variant="solid"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenAdd}
            >
              Add Currency
            </Button>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Exchange Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
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
                    colSpan={6}
                    className="h-24 text-center text-red-500"
                  >
                    <TableStateMessage
                      variant="error"
                      message="Failed to load currencies. Please try again."
                      onRetry={refetch}
                    />
                  </TableCell>
                </TableRow>
              ) : currencies.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground h-32 text-center"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No currencies found. Add one to get started."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                currencies.map(currency => (
                  <TableRow key={currency.id}>
                    <TableCell className="font-medium">{currency.name}</TableCell>
                    <TableCell>{currency.symbol}</TableCell>
                    <TableCell className="font-mono text-sm">{currency.code}</TableCell>
                    <TableCell>{currency.exchangeRate.toFixed(4)}</TableCell>
                    <TableCell>
                      <StatusBadge variant={currency.status === 'active' ? 'success' : 'neutral'}>
                        {currency.status === 'active' ? 'Active' : 'Inactive'}
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
                          <DropdownMenuItem onClick={() => handleOpenEdit(currency)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {currency.status === 'inactive' && (
                            <DropdownMenuItem
                              onClick={() => handleActionClick(currency, 'activate')}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleActionClick(currency, 'delete')}
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
      <CurrencyDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        currency={editingCurrency}
      />

      {/* Delete Alert Dialog */}
      <AlertDialog
        open={!!pendingAction}
        onOpenChange={open => !open && setPendingAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === 'delete' ? 'Delete Currency?' : 'Activate Currency?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.currency && (
                <>
                  <span className="text-foreground font-semibold">
                    {pendingAction.currency.name} ({pendingAction.currency.code})
                  </span>{' '}
                  {pendingAction.action === 'delete'
                    ? 'will be deleted. If it is linked to purchase orders, it will instead be marked inactive.'
                    : 'will be marked active and available for new purchase orders.'}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={
                pendingAction?.action === 'delete'
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
                  : undefined
              }
            >
              {pendingAction?.action === 'delete' ? 'Delete' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
