'use client';

import { useMemo, useState } from 'react';

import { Edit, MoreHorizontal, Plus, Trash } from 'lucide-react';

import { Skeleton } from '@/features/feedback/Skeleton';
import { PaginationControls } from '@/features/pagination/pagination-controls';
import {
  InboundShippingMethod,
  useCreateInboundShippingMethod,
  useDeleteInboundShippingMethod,
  useGetInboundShippingMethods,
  useUpdateInboundShippingMethod,
} from '@/hooks/useInboundShippingMethodQueries';
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

type InboundShippingMethodDialogProps = {
  method: InboundShippingMethod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function InboundShippingMethodDialog({
  method,
  open,
  onOpenChange,
}: InboundShippingMethodDialogProps) {
  const isEdit = !!method;
  const createMutation = useCreateInboundShippingMethod();
  const updateMutation = useUpdateInboundShippingMethod();

  const initialData = useMemo(
    () =>
      method
        ? {
            code: method.code,
            name: method.name,
            description: method.description ?? '',
            status: method.status,
          }
        : {
            code: '',
            name: '',
            description: '',
            status: 'inactive' as InboundShippingMethod['status'],
          },
    [method],
  );

  const [formData, setFormData] = useState(initialData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
    };

    try {
      if (isEdit && method) {
        await updateMutation.mutateAsync({ id: method.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // errors handled by hooks
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isDisabled = !formData.code.trim() || !formData.name.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? 'Edit Inbound Shipping Method' : 'Add Inbound Shipping Method'}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update how inbound shipping is labeled on purchase orders.'
                : 'Add a new inbound shipping method for purchase orders.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inbound-method-code">Code*</Label>
              <Input
                id="inbound-method-code"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                required
                placeholder="e.g. sea_freight, air_express"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inbound-method-name">Name*</Label>
              <Input
                id="inbound-method-name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. Sea Freight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inbound-method-description">Description</Label>
              <Input
                id="inbound-method-description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional notes shown to your team"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inbound-method-status">Status*</Label>
              <Select
                value={formData.status}
                onValueChange={value =>
                  setFormData({ ...formData, status: value as InboundShippingMethod['status'] })
                }
              >
                <SelectTrigger id="inbound-method-status">
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
              disabled={isLoading || isDisabled}
            >
              {isEdit ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function InboundShippingMethodsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<InboundShippingMethod | null>(null);
  const [methodToDelete, setMethodToDelete] = useState<InboundShippingMethod | null>(null);

  const limit = 10;
  const statusFilter = status === 'all' ? undefined : status;

  const { data, isLoading, isError, refetch } = useGetInboundShippingMethods({
    page,
    limit,
    ...(statusFilter ? { status: statusFilter } : {}),
  });

  const deleteMutation = useDeleteInboundShippingMethod();

  const items = data?.items ?? [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const handleOpenAdd = () => {
    setEditingMethod(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: InboundShippingMethod) => {
    setEditingMethod(item);
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    if (methodToDelete) {
      deleteMutation.mutate(methodToDelete.id);
      setMethodToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Inbound Shipping Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Select
                value={status}
                onValueChange={value => {
                  setStatus(value as 'active' | 'inactive' | 'all');
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="solid"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenAdd}
            >
              Add Method
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
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
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-40" />
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
                    colSpan={5}
                    className="h-24 text-center text-red-500"
                  >
                    <TableStateMessage
                      variant="error"
                      message="Failed to load inbound shipping methods. Please try again."
                      onRetry={refetch}
                    />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground h-32 text-center"
                  >
                    <TableStateMessage
                      variant="empty"
                      message="No inbound shipping methods found. Add one to get started."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map(method => (
                  <TableRow key={method.id}>
                    <TableCell className="font-medium">{method.code}</TableCell>
                    <TableCell className="font-medium">{method.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {method.description || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={method.status === 'active' ? 'success' : 'neutral'}>
                        {method.status === 'active' ? 'Active' : 'Inactive'}
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
                          <DropdownMenuItem onClick={() => handleOpenEdit(method)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setMethodToDelete(method)}
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

      <InboundShippingMethodDialog
        key={editingMethod?.id ?? 'new'}
        method={editingMethod}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />

      <AlertDialog
        open={!!methodToDelete}
        onOpenChange={open => !open && setMethodToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete
              <span className="text-foreground font-semibold"> {methodToDelete?.name} </span>
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
