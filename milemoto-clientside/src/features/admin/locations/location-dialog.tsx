'use client';

import { useMemo, useState } from 'react';

import {
  StockLocation,
  useCreateStockLocation,
  useUpdateStockLocation,
} from '@/hooks/useStockLocationQueries';
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

type LocationDialogProps = {
  location: StockLocation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const INITIAL_FORM = {
  name: '',
  type: 'Warehouse' as StockLocation['type'],
  description: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  status: 'active' as 'active' | 'inactive',
};

export function LocationDialog({ location, open, onOpenChange }: LocationDialogProps) {
  const isEdit = !!location;
  const createMutation = useCreateStockLocation();
  const updateMutation = useUpdateStockLocation();

  const initialData = useMemo(
    () =>
      location
        ? {
            name: location.name,
            type: location.type,
            description: location.description || '',
            address: location.address || '',
            city: location.city || '',
            state: location.state || '',
            postalCode: location.postalCode || '',
            country: location.country || '',
            status: (location.status || 'active') as 'active' | 'inactive',
          }
        : INITIAL_FORM,
    [location],
  );

  // Form state
  // key prop on Dialog ensures re-initialization when location changes
  const [formData, setFormData] = useState(initialData);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEdit && location) {
        await updateMutation.mutateAsync({ id: location.id, data: formData });
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
      key={location?.id ?? 'create'}
    >
      <DialogContent className="max-w-md">
        {/* Using a key ensures the form is fully reset when the location changes.
           If location is null (create mode), key is "create".
           If editing, key uses the location ID.
        */}
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Location' : 'Add New Location'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update stock location details below.'
                : 'Add a new stock location to the system.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name*</Label>
              <Input
                id="name"
                placeholder="e.g. Main Warehouse"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Location Type*</Label>
              <Select
                value={formData.type}
                onValueChange={value =>
                  setFormData({ ...formData, type: value as StockLocation['type'] })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Warehouse">Warehouse</SelectItem>
                  <SelectItem value="Store">Store</SelectItem>
                  <SelectItem value="Office">Office</SelectItem>
                  <SelectItem value="Factory">Factory</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of the location..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Street address..."
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="resize-none"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  placeholder="ZIP/Postal Code"
                  value={formData.postalCode}
                  onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="Country"
                  value={formData.country}
                  onChange={e => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
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
              {isEdit ? 'Update Location' : 'Add Location'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
