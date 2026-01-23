'use client';

import { useMemo, useState } from 'react';

import { useCreateWarranty, useUpdateWarranty, type Warranty } from '@/hooks/useWarrantyQueries';
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
import { Textarea } from '@/ui/textarea';

type WarrantyDialogProps = {
  warranty: Warranty | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const INITIAL_FORM = {
  name: '',
  description: '',
  status: 'active' as 'active' | 'inactive',
};

export function WarrantyDialog({ warranty, open, onOpenChange }: WarrantyDialogProps) {
  const isEdit = !!warranty;
  const createMutation = useCreateWarranty();
  const updateMutation = useUpdateWarranty();

  const initialData = useMemo(
    () =>
      warranty
        ? {
            name: warranty.name,
            description: warranty.description || '',
            status: warranty.status,
          }
        : INITIAL_FORM,
    [warranty],
  );

  const [formData, setFormData] = useState(initialData);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEdit && warranty) {
        await updateMutation.mutateAsync({ id: warranty.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch {
      // Error handling is done in the hook
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
            <DialogTitle>{isEdit ? 'Edit Warranty' : 'Add New Warranty'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Update warranty details below.' : 'Add a new warranty to the system.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Warranty Name*</Label>
              <Input
                id="name"
                placeholder="e.g. 1 Year Warranty"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of the warranty..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status*</Label>
              <Select
                value={formData.status}
                onValueChange={value =>
                  setFormData({ ...formData, status: value as 'active' | 'inactive' })
                }
              >
                <SelectTrigger id="status">
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
              disabled={isLoading || (isEdit && !isDirty)}
            >
              {isEdit ? 'Update Warranty' : 'Add Warranty'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
