'use client';

import React, { useMemo, useState } from 'react';

import { useCreateCurrency, useUpdateCurrency, type Currency } from '@/hooks/useCurrencyQueries';
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

// ==== Types & Constants ====

type CurrencyFormData = {
  name: string;
  code: string;
  symbol: string;
  exchangeRate: string; // string for input handling
  status: 'active' | 'inactive';
};

const INITIAL_FORM: CurrencyFormData = {
  name: '',
  code: '',
  symbol: '',
  exchangeRate: '1.0',
  status: 'active',
};

// ==== Sub-components ====

function FormField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label
        htmlFor={id}
        className="text-left"
        required={true}
      >
        {label}
      </Label>
      <div className="col-span-3">{children}</div>
    </div>
  );
}

function CurrencyForm({
  currency,
  onSuccess,
  onCancel,
}: {
  currency?: Currency | null | undefined;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEditMode = Boolean(currency);
  const initialData = useMemo(
    () =>
      currency
        ? {
            name: currency.name,
            code: currency.code,
            symbol: currency.symbol,
            exchangeRate: String(currency.exchangeRate),
            status: currency.status,
          }
        : INITIAL_FORM,
    [currency],
  );

  const [formData, setFormData] = useState<CurrencyFormData>(initialData);

  const createMutation = useCreateCurrency();
  const updateMutation = useUpdateCurrency();

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      exchangeRate: parseFloat(formData.exchangeRate),
      code: formData.code.toUpperCase(),
    };

    try {
      if (isEditMode && currency) {
        await updateMutation.mutateAsync({ id: currency.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSuccess();
    } catch {
      // Error handled by hook toast
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditMode ? 'Edit Currency' : 'Add New Currency'}</DialogTitle>
        <DialogDescription>
          {isEditMode ? 'Update the currency details.' : 'Add a new currency to your store.'}
        </DialogDescription>
      </DialogHeader>
      <form
        id="currency-form"
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
            placeholder="e.g., US Dollar"
          />
        </FormField>
        <FormField
          id="code"
          label="Code"
        >
          <Input
            id="code"
            required
            value={formData.code}
            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="e.g., USD"
            maxLength={5}
          />
        </FormField>
        <FormField
          id="symbol"
          label="Symbol"
        >
          <Input
            id="symbol"
            required
            value={formData.symbol}
            onChange={e => setFormData({ ...formData, symbol: e.target.value })}
            placeholder="e.g., $"
          />
        </FormField>
        <FormField
          id="exchangeRate"
          label="Exchange Rate"
        >
          <Input
            id="exchangeRate"
            type="number"
            step="0.000001"
            min="0"
            required
            value={formData.exchangeRate}
            onChange={e => setFormData({ ...formData, exchangeRate: e.target.value })}
            placeholder="e.g., 1.0"
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
      </form>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="currency-form"
          variant="solid"
          disabled={isPending || (isEditMode && !isDirty)}
        >
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </>
  );
}

export function CurrencyDialog({
  open,
  onOpenChange,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: Currency | null;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-[425px]">
        <CurrencyForm
          currency={currency}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
