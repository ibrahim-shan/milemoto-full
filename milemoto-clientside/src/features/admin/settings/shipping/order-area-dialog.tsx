import React, { useMemo, useState } from 'react';

import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { useGetAllCities, useGetAllCountries, useGetAllStates } from '@/hooks/useLocationQueries';
import {
  useCreateAreaRate,
  useUpdateAreaRate,
  type ShippingAreaRate,
} from '@/hooks/useShippingQueries';
import { Button } from '@/ui/button';
import { GeneralCombobox } from '@/ui/combobox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';

type AreaRateFormData = {
  countryId: string;
  stateId: string;
  cityId: string;
  cost: string;
};

const INITIAL_AREA_FORM: AreaRateFormData = {
  countryId: '',
  stateId: '',
  cityId: '',
  cost: '',
};

export function OrderAreaDialog({
  open,
  onOpenChange,
  area,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area?: ShippingAreaRate | null;
}) {
  const isEditMode = Boolean(area);
  const { symbol: currencySymbol } = useDefaultCurrency();

  const initialData = useMemo(
    () =>
      area
        ? {
            countryId: String(area.countryId),
            stateId: area.stateId ? String(area.stateId) : '',
            cityId: area.cityId ? String(area.cityId) : '',
            cost: String(area.cost),
          }
        : INITIAL_AREA_FORM,
    [area],
  );

  const [formData, setFormData] = useState<AreaRateFormData>(initialData);

  // Fetch Countries for Dropdown
  const { data: countriesData } = useGetAllCountries();

  // Fetch States based on selected country
  const { data: statesData } = useGetAllStates();
  const filteredStates =
    statesData?.items.filter(state => state.countryId === parseInt(formData.countryId)) || [];

  // Fetch Cities based on selected state
  const { data: citiesData } = useGetAllCities();
  const filteredCities =
    citiesData?.items.filter(city => city.stateId === parseInt(formData.stateId)) || [];

  const createMutation = useCreateAreaRate();
  const updateMutation = useUpdateAreaRate();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleCountryChange = (countryId: string) => {
    setFormData({
      countryId: countryId,
      stateId: '',
      cityId: '',
      cost: formData.cost,
    });
  };

  const handleStateChange = (stateId: string) => {
    setFormData({
      ...formData,
      stateId: stateId,
      cityId: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      cost: parseFloat(formData.cost),
      countryId: parseInt(formData.countryId),
      stateId: formData.stateId ? parseInt(formData.stateId) : null,
      cityId: formData.cityId ? parseInt(formData.cityId) : null,
    };

    try {
      if (isEditMode && area) {
        await updateMutation.mutateAsync({ id: area.id, cost: payload.cost });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // Error toast handled by hook
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Order Area' : 'Add Order Area'}</DialogTitle>
        </DialogHeader>
        <form
          key={area?.id ?? 'new'}
          id="area-form"
          onSubmit={handleSubmit}
          className="space-y-4 py-4"
        >
          {/* Country Combobox */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label
              htmlFor="country"
              required={true}
              className="text-right"
            >
              Country
            </Label>
            <div className="col-span-3">
              <GeneralCombobox
                placeholder="Select Country"
                value={formData.countryId ?? ''}
                onChange={val => handleCountryChange(String(val))}
                className="w-full"
                data={
                  countriesData?.items.map(country => ({
                    value: String(country.id),
                    label: country.name,
                    searchValue: country.name,
                  })) ?? []
                }
                disabled={isEditMode}
              />
            </div>
          </div>

          {/* State Combobox */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label
              htmlFor="state"
              required={true}
              className="text-right"
            >
              State
            </Label>
            <div className="col-span-3">
              <GeneralCombobox
                placeholder="Select State (Optional)"
                value={formData.stateId ?? ''}
                onChange={val => handleStateChange(String(val))}
                className="w-full"
                data={filteredStates.map(state => ({
                  value: String(state.id),
                  label: state.name,
                  searchValue: state.name,
                }))}
                disabled={isEditMode || !formData.countryId}
              />
            </div>
          </div>

          {/* City Combobox */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label
              htmlFor="city"
              required={true}
              className="text-right"
            >
              City
            </Label>
            <div className="col-span-3">
              <GeneralCombobox
                placeholder="Select City (Optional)"
                value={formData.cityId ?? ''}
                onChange={val => setFormData(prev => ({ ...prev, cityId: String(val) }))}
                className="w-full"
                data={filteredCities.map(city => ({
                  value: String(city.id),
                  label: city.name,
                  searchValue: city.name,
                }))}
                disabled={isEditMode || !formData.stateId}
              />
            </div>
          </div>

          {/* Cost Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label
              htmlFor="cost"
              required={true}
              className="text-right"
            >
              Cost
            </Label>
            <div className="col-span-3">
              <div className="relative">
                <span className="text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">
                  {currencySymbol}
                </span>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={e => setFormData({ ...formData, cost: e.target.value })}
                  className="pl-7"
                  placeholder="0.00"
                  required
                />
              </div>
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
            form="area-form"
            variant="solid"
            disabled={isPending || (isEditMode && !isDirty)}
          >
            {isPending ? 'Saving...' : 'Save Order Area'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
