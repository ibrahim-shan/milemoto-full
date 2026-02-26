'use client';

import React, { useMemo, useState } from 'react';

import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { useGetAllCountries } from '@/hooks/useLocationQueries';
import { useCreateTax, useUpdateTax, type Tax } from '@/hooks/useTaxQueries';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { GeneralCombobox } from '@/ui/combobox';
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

// ==== Types & Constants ====

type TaxFormData = {
  name: string;
  rate: string; // Use string for input, convert to number on submit
  type: 'percentage' | 'fixed';
  status: 'active' | 'inactive';
  countryId: string; // Use string for combobox, convert to number on submit
  validFrom: string;
  validTo: string;
};

const INITIAL_FORM: TaxFormData = {
  name: '',
  rate: '',
  type: 'percentage',
  status: 'active',
  countryId: '', // Empty string means global (null in database)
  validFrom: '',
  validTo: '',
};

// ==== Sub-components ====

function FormField({
  id,
  label,
  required = true,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label
        htmlFor={id}
        required={required}
        className="text-right"
      >
        {label}
      </Label>
      <div className="col-span-3">{children}</div>
    </div>
  );
}

export function TaxDialog({
  open,
  onOpenChange,
  tax,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tax?: Tax | null;
}) {
  const isEditMode = Boolean(tax);
  const { symbol: currencySymbol } = useDefaultCurrency();
  const { data: countriesData } = useGetAllCountries();

  const initialData = useMemo(
    () =>
      tax
        ? {
            name: tax.name,
            rate: String(tax.rate),
            type: tax.type,
            status: tax.status,
            countryId: tax.countryId ? String(tax.countryId) : '',
            validFrom: toDateInputValue(tax.validFrom),
            validTo: toDateInputValue(tax.validTo),
          }
        : INITIAL_FORM,
    [tax],
  );

  const [formData, setFormData] = useState<TaxFormData>(initialData);
  const [useEffectiveDateWindow, setUseEffectiveDateWindow] = useState(
    Boolean(initialData.validFrom || initialData.validTo),
  );

  const createMutation = useCreateTax();
  const updateMutation = useUpdateTax();

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);
  const isAlwaysActive = !useEffectiveDateWindow;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      rate: parseFloat(formData.rate),
      countryId: formData.countryId ? parseInt(formData.countryId) : null, // Convert to number or null
      validFrom:
        useEffectiveDateWindow && formData.validFrom
          ? new Date(`${formData.validFrom}T00:00:00.000Z`)
          : null,
      validTo:
        useEffectiveDateWindow && formData.validTo
          ? new Date(`${formData.validTo}T23:59:59.999Z`)
          : null,
    };

    try {
      if (isEditMode && tax) {
        await updateMutation.mutateAsync({ id: tax.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // Error handled by hook toast
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Tax' : 'Add New Tax'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the tax details.' : 'Configure a new tax rate for your store.'}
          </DialogDescription>
        </DialogHeader>
        <form
          id="tax-form"
          onSubmit={handleSubmit}
          className="space-y-4 py-4"
        >
          <FormField
            id="name"
            label="Name"
          >
            <Input
              id="name"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., VAT"
            />
          </FormField>
          <FormField
            id="type"
            label="Type"
          >
            <Select
              value={formData.type}
              onValueChange={(val: 'percentage' | 'fixed') =>
                setFormData({ ...formData, type: val })
              }
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            id="rate"
            label="Rate"
          >
            <div className="relative">
              {formData.type === 'percentage' && (
                <span className="text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">
                  %
                </span>
              )}
              {formData.type === 'fixed' && (
                <span className="text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">
                  {currencySymbol}
                </span>
              )}
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.rate}
                onChange={e => setFormData({ ...formData, rate: e.target.value })}
                placeholder={formData.type === 'percentage' ? 'e.g., 20' : 'e.g., 5.00'}
                className="pl-7 pr-3"
              />
            </div>
          </FormField>
          <FormField
            id="country"
            label="Country"
          >
            <GeneralCombobox
              id="country"
              placeholder="None (Global - applies to all countries)"
              value={formData.countryId}
              onChange={value => setFormData({ ...formData, countryId: String(value) })}
              data={[
                { value: '', label: 'None (Global)', searchValue: 'None Global' },
                ...(countriesData?.items.map(country => ({
                  value: String(country.id),
                  label: country.name,
                  searchValue: country.name,
                })) || []),
              ]}
            />
          </FormField>
          <FormField
            id="status"
            label="Status"
          >
            <Select
              value={formData.status}
              onValueChange={(val: 'active' | 'inactive') =>
                setFormData({ ...formData, status: val })
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            id="validFrom"
            label="Valid From"
            required={false}
          >
            <Input
              id="validFrom"
              type="date"
              value={formData.validFrom}
              disabled={isAlwaysActive}
              onChange={e => setFormData({ ...formData, validFrom: e.target.value })}
            />
          </FormField>
          <FormField
            id="validTo"
            label="Valid To"
            required={false}
          >
            <Input
              id="validTo"
              type="date"
              value={formData.validTo}
              disabled={isAlwaysActive}
              onChange={e => setFormData({ ...formData, validTo: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label
              htmlFor="alwaysActiveWindow"
              required={false}
              className="pt-1 text-left"
            >
              Effective Dates
            </Label>
            <div className="col-span-3 space-y-2">
              <label
                htmlFor="alwaysActiveWindow"
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  id="alwaysActiveWindow"
                  checked={isAlwaysActive}
                  onCheckedChange={checked => {
                    if (checked === true) {
                      setUseEffectiveDateWindow(false);
                      setFormData(prev => ({ ...prev, validFrom: '', validTo: '' }));
                    } else if (checked === false) {
                      setUseEffectiveDateWindow(true);
                    }
                  }}
                />
                <span>Always active (no effective date window)</span>
              </label>
              <p className="text-muted-foreground text-xs">
                If checked, both dates stay empty and the rule is always active.
              </p>
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="tax-form"
            variant="solid"
            disabled={isPending || (isEditMode && !isDirty)}
          >
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
