'use client';

import React, { useMemo, useState } from 'react';

import { useCreateLanguage, useUpdateLanguage, type Language } from '@/hooks/useLanguageQueries';
import { Button } from '@/ui/button';
import { Country, CountryDropdown } from '@/ui/country-dropdown';
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

// Helper component for form fields
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
        required={true}
        className="text-right"
      >
        {label}
      </Label>
      <div className="col-span-3">{children}</div>
    </div>
  );
}

export function LanguageDialog({
  open,
  onOpenChange,
  language,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language?: Language | null;
}) {
  const isEditMode = Boolean(language);

  // Define initial state
  const initialData = useMemo(
    () => ({
      name: language?.name || '',
      code: language?.code || '',
      status: (language?.status || 'active') as 'active' | 'inactive',
      displayMode: (language?.displayMode || 'LTR') as 'LTR' | 'RTL',
      countryCode: language?.countryCode || null,
    }),
    [language],
  );

  const [formData, setFormData] = useState(initialData);

  // Mutations
  const createMutation = useCreateLanguage();
  const updateMutation = useUpdateLanguage();

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Check for changes
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditMode && language) {
        await updateMutation.mutateAsync({
          id: language.id,
          ...formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch {
      // Error handling is done via toast in the hook
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={val => !isPending && onOpenChange(val)}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Language' : 'Add New Language'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the language details.' : 'Add a new language to your store.'}
          </DialogDescription>
        </DialogHeader>
        <form
          id="language-form"
          onSubmit={handleSubmit}
          className="space-y-4 py-4"
        >
          <FormField
            id="name"
            label="Name"
          >
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., English"
              required
              disabled={isPending}
            />
          </FormField>
          <FormField
            id="code"
            label="Code"
          >
            <Input
              id="code"
              value={formData.code}
              onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
              placeholder="e.g., en"
              required
              disabled={isPending}
            />
          </FormField>
          <FormField
            id="displayMode"
            label="Mode"
          >
            <Select
              value={formData.displayMode}
              onValueChange={(value: 'LTR' | 'RTL') =>
                setFormData(prev => ({ ...prev, displayMode: value }))
              }
              disabled={isPending}
            >
              <SelectTrigger id="displayMode">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LTR">LTR (Left-to-Right)</SelectItem>
                <SelectItem value="RTL">RTL (Right-to-Left)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            id="country"
            label="Flag"
          >
            <CountryDropdown
              showCallingCode={false}
              onChange={(c: Country) => setFormData(prev => ({ ...prev, countryCode: c.alpha2 }))}
              defaultValue={formData.countryCode || ''}
              placeholder="Select country"
              disabled={isPending}
            />
          </FormField>
          <FormField
            id="status"
            label="Status"
          >
            <Select
              value={formData.status}
              onValueChange={(value: 'active' | 'inactive') =>
                setFormData(prev => ({ ...prev, status: value }))
              }
              disabled={isPending}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
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
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="language-form"
            variant="solid"
            // Disable if loading OR (editing AND no changes)
            disabled={isPending || (isEditMode && !isDirty)}
          >
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
