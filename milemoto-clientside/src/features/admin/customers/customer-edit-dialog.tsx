'use client';

import { useState } from 'react';

import { Customer, useUpdateCustomer } from '@/hooks/useCustomerQueries';
import { Button } from '@/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';

type CustomerEditDialogProps = {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CustomerEditDialog({ customer, open, onOpenChange }: CustomerEditDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer Status' : 'Add New Customer'}</DialogTitle>
          <DialogDescription>
            {customer
              ? 'Update the status of the customer. Other details are read-only.'
              : 'Add a new customer to the system.'}
          </DialogDescription>
        </DialogHeader>
        <CustomerEditForm
          customer={customer}
          onClose={() => onOpenChange(false)}
          key={customer?.id ?? 'create'}
        />
      </DialogContent>
    </Dialog>
  );
}

function CustomerEditForm({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  const isEdit = !!customer;
  const updateCustomer = useUpdateCustomer();

  const initialData = {
    status: customer?.status ?? 'active',
  };

  const [formData, setFormData] = useState(initialData);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEdit && customer) {
      updateCustomer.mutate(
        { id: customer.id, data: { status: formData.status } },
        {
          onSuccess: () => {
            onClose();
          },
        },
      );
    } else {
      console.log('Creating customer not implemented');
      onClose();
    }
  };

  const isLoading = updateCustomer.isPending;

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            value={customer?.fullName || ''}
            readOnly
            disabled
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={customer?.email || ''}
            readOnly
            disabled
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={customer?.phone || ''}
            readOnly
            disabled
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status*</Label>
          <Select
            value={formData.status}
            onValueChange={value =>
              setFormData({ ...formData, status: value as 'active' | 'inactive' | 'blocked' })
            }
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="solid"
          disabled={isLoading || (isEdit && !isDirty)}
        >
          {isLoading ? 'Updating...' : 'Update Status'}
        </Button>
      </DialogFooter>
    </form>
  );
}
