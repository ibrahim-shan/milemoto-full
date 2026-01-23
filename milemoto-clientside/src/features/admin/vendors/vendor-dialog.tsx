'use client';

import { useMemo, useState } from 'react';

import { Country } from 'react-phone-number-input';

import { useCreateVendor, useUpdateVendor, type Vendor } from '@/hooks/useVendorQueries';
import { Button } from '@/ui/button';
import { CountryDropdown } from '@/ui/country-dropdown';
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
import { PhoneField } from '@/ui/phone-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Textarea } from '@/ui/textarea';

type VendorDialogProps = {
  vendor: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const INITIAL_FORM = {
  name: '',
  description: '',
  country: '',
  address: '',
  phoneNumber: '',
  phoneCode: '',
  email: '',
  website: '',
  status: 'active' as 'active' | 'inactive',
};

export function VendorDialog({ vendor, open, onOpenChange }: VendorDialogProps) {
  const isEdit = !!vendor;
  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();

  const initialData = useMemo(
    () =>
      vendor
        ? {
            name: vendor.name,
            description: vendor.description || '',
            country: vendor.country,
            address: vendor.address || '',
            phoneNumber: vendor.phoneNumber || '',
            phoneCode: vendor.phoneCode || '',
            email: vendor.email || '',
            website: vendor.website || '',
            status: vendor.status,
          }
        : INITIAL_FORM,
    [vendor],
  );

  const [formData, setFormData] = useState(initialData);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEdit && vendor) {
        await updateMutation.mutateAsync({ id: vendor.id, data: formData });
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
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Update vendor details below.' : 'Add a new vendor to the system.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Vendor Name*</Label>
              <Input
                id="name"
                placeholder="e.g. Acme Corp"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country*</Label>
              <CountryDropdown
                defaultValue={formData.country}
                onChange={country => setFormData({ ...formData, country: country.name })}
                placeholder="Select country"
                slim={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Full address"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <PhoneField
                id="phone"
                value={formData.phoneNumber}
                onChange={(value, meta) =>
                  setFormData({
                    ...formData,
                    phoneNumber: value,
                    phoneCode: meta.country,
                  })
                }
                defaultCountry={(formData.phoneCode as Country) || undefined}
                placeholder="Enter phone number"
                slimDropdown={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@vendor.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://vendor.com"
                value={formData.website}
                onChange={e => setFormData({ ...formData, website: e.target.value })}
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
              disabled={isLoading || (isEdit && !isDirty) || !formData.country}
            >
              {isEdit ? 'Update Vendor' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
