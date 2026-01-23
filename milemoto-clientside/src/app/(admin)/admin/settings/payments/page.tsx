'use client';

import { useMemo, useState } from 'react';

import { Edit, MoreHorizontal, Plus, Search, Trash } from 'lucide-react';

import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import { useDebounce } from '@/hooks/useDebounce';
import {
  PaymentMethod,
  useCreatePaymentMethod,
  useDeletePaymentMethod,
  useGetPaymentMethods,
  useUpdatePaymentMethod,
} from '@/hooks/usePaymentMethodQueries';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { TableStateMessage } from '@/ui/table-state-message';

type PaymentMethodDialogProps = {
  paymentMethod: PaymentMethod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function PaymentMethodDialog({ paymentMethod, open, onOpenChange }: PaymentMethodDialogProps) {
  const isEdit = !!paymentMethod;
  const createMutation = useCreatePaymentMethod();
  const updateMutation = useUpdatePaymentMethod();

  const initialData = useMemo(
    () =>
      paymentMethod
        ? {
            name: paymentMethod.name,
            status: paymentMethod.status,
          }
        : {
            name: '',
            status: 'active' as PaymentMethod['status'],
          },
    [paymentMethod],
  );

  const [formData, setFormData] = useState(initialData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = { name: formData.name.trim(), status: formData.status };

    try {
      if (isEdit && paymentMethod) {
        await updateMutation.mutateAsync({ id: paymentMethod.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // errors are surfaced via toast in hooks
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update payment method details.'
                : 'Add a new payment method that will be available during checkout.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method-name">Payment Method Name*</Label>
              <Input
                id="payment-method-name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. Cash on Delivery, Bank Transfer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method-status">Status*</Label>
              <Select
                value={formData.status}
                onValueChange={value =>
                  setFormData({ ...formData, status: value as PaymentMethod['status'] })
                }
              >
                <SelectTrigger id="payment-method-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              isLoading={isLoading}
              disabled={isLoading || !formData.name.trim()}
            >
              {isEdit ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<PaymentMethod | null>(null);

  const limit = 10;

  const { data, isLoading, isError, refetch } = useGetPaymentMethods({
    search: debouncedSearch,
    page,
    limit,
  });

  const deleteMutation = useDeletePaymentMethod();

  const items = data?.items ?? [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const handleOpenAdd = () => {
    setEditingPaymentMethod(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PaymentMethod) => {
    setEditingPaymentMethod(item);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (pm: PaymentMethod) => {
    setPaymentMethodToDelete(pm);
  };

  const confirmDelete = () => {
    if (paymentMethodToDelete) {
      deleteMutation.mutate(paymentMethodToDelete.id);
      setPaymentMethodToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder="Search payment methods..."
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
              Add Payment Method
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
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
                    colSpan={3}
                    className="h-24 text-center text-red-500"
                  >
                    <TableStateMessage
                      variant="error"
                      message="Failed to load payment methods. Please try again."
                      onRetry={refetch}
                    />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-muted-foreground h-32 text-center"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No payment methods found. Add one to get started."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map(pm => (
                  <TableRow key={pm.id}>
                    <TableCell className="font-medium">{pm.name}</TableCell>
                    <TableCell>
                      <StatusBadge variant={pm.status === 'active' ? 'success' : 'neutral'}>
                        {pm.status === 'active' ? 'Active' : 'Inactive'}
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
                          <DropdownMenuItem onClick={() => handleOpenEdit(pm)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(pm)}
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

      <PaymentMethodDialog
        key={editingPaymentMethod?.id ?? 'new'}
        paymentMethod={editingPaymentMethod}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />

      <AlertDialog
        open={!!paymentMethodToDelete}
        onOpenChange={open => !open && setPaymentMethodToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the payment method
              <span className="text-foreground font-semibold"> {paymentMethodToDelete?.name} </span>
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
