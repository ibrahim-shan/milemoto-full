'use client';

import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CityResponse,
  CountryDropdownItem,
  CountryResponse,
  CreateCity,
  CreateCountry,
  CreateCountryDto,
  CreateCountryOutputDto,
  CreateState,
  StateDropdownItem,
  StateResponse,
} from '@milemoto/types';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import {
  useCreateCity,
  useCreateCountry,
  useCreateState,
  useGetAllCountries,
  useGetAllStates,
  useUpdateCity,
  useUpdateCountry,
  useUpdateState,
} from '@/hooks/useLocationQueries';
import { Button } from '@/ui/button';
import { GeneralCombobox } from '@/ui/combobox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/ui/dialog';
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  FormField as RHFFormField,
} from '@/ui/form';
import { Input } from '@/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';

type DialogProps<T> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: T | null;
};

const CreateStateFormSchema = z.object({
  name: CreateState.shape.name,
  countryId: z.string().min(1, 'Country is required'),
  status: CreateState.shape.status,
});

const CreateCityFormSchema = z.object({
  name: CreateCity.shape.name,
  stateId: z.string().min(1, 'State is required'),
  status: CreateCity.shape.status,
});

// --- Country Dialog (This component is correct) ---
export function CountryDialog({ open, onOpenChange, item }: DialogProps<CountryResponse>) {
  const isEditMode = Boolean(item);

  const createMutation = useCreateCountry();
  const updateMutation = useUpdateCountry();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<CreateCountryDto, undefined, CreateCountryOutputDto>({
    resolver: zodResolver(CreateCountry),
    defaultValues: {
      name: '',
      code: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          name: item.name,
          code: item.code,
          status: item.status,
        });
      } else {
        form.reset({
          name: '',
          code: '',
          status: 'active',
        });
      }
    }
  }, [open, item, form]);

  const handleSubmit = (data: CreateCountryOutputDto) => {
    if (isEditMode && item) {
      updateMutation.mutate({ id: item.id, ...data }, { onSuccess: () => onOpenChange(false) });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Country' : 'Add Country'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            id="country-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 py-4"
          >
            <RHFFormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center">
                  <FormLabel required={true}>Country Name</FormLabel>
                  <FormControl className="col-span-3">
                    <Input
                      {...field}
                      placeholder="e.g., United States"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage className="col-span-4" />
                </FormItem>
              )}
            />

            <RHFFormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center">
                  <FormLabel
                    required={true}
                    className="text-left"
                  >
                    Country Code
                  </FormLabel>
                  <FormControl className="col-span-3">
                    <Input
                      {...field}
                      placeholder="e.g., US"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage className="col-span-4" />
                </FormItem>
              )}
            />

            <RHFFormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center">
                  <FormLabel
                    required={true}
                    className="text-left"
                  >
                    Status
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending}
                  >
                    <FormControl className="col-span-3">
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="col-span-4" />
                </FormItem>
              )}
            />
          </form>
        </Form>
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
            form="country-form"
            variant="solid"
            disabled={isPending || !form.formState.isDirty}
            isLoading={isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- State Dialog (Fixed) ---
export function StateDialog({ open, onOpenChange, item }: DialogProps<StateResponse>) {
  const isEditMode = Boolean(item);
  const createMutation = useCreateState();
  const updateMutation = useUpdateState();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const { data: countriesData, isLoading: isLoadingCountries } = useGetAllCountries();
  const countries = useMemo<CountryDropdownItem[]>(
    () => countriesData?.items ?? [],
    [countriesData],
  );

  const augmentedCountries = useMemo<CountryDropdownItem[]>(() => {
    if (!isEditMode || !item) return countries;
    if (countries.some(country => country.id === item.countryId)) return countries;
    return [
      {
        id: item.countryId,
        name: item.countryName,
        status: item.countryStatus,
      },
      ...countries,
    ];
  }, [countries, isEditMode, item]);

  const form = useForm<z.infer<typeof CreateStateFormSchema>>({
    resolver: zodResolver(CreateStateFormSchema),
    defaultValues: {
      name: '',
      countryId: '',
      status: 'active' as const,
    },
  });

  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          name: item.name,
          countryId: String(item.countryId),
          status: item.status,
        });
      } else {
        form.reset({
          name: '',
          countryId: '',
          status: 'active',
        });
      }
    }
  }, [open, item, form]);

  // Fixed useWatch - remove generic parameter
  const watchedCountryId = useWatch({
    control: form.control,
    name: 'countryId',
  });

  const numericCountryId = watchedCountryId ? Number(watchedCountryId) : undefined;
  const selectedFromActiveList = countries.some(country => country.id === numericCountryId);
  const allowActiveState =
    selectedFromActiveList ||
    (isEditMode &&
      item !== null &&
      item.countryId === numericCountryId &&
      item.countryStatus === 'active' &&
      item.countryStatusEffective === 'active');

  // Handle the type conversion in the submit handler
  const handleSubmit = (data: z.infer<typeof CreateStateFormSchema>) => {
    const submitData = CreateState.parse(data);
    if (isEditMode && item) {
      updateMutation.mutate(
        { id: item.id, ...submitData },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(submitData, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit State' : 'Add State'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            id="state-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 py-4"
          >
            <RHFFormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel
                    required={true}
                    className="text-left"
                  >
                    State Name
                  </FormLabel>
                  <FormControl className="col-span-3">
                    <Input
                      {...field}
                      placeholder="e.g., California"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage className="col-span-4" />
                </FormItem>
              )}
            />

            <RHFFormField
              control={form.control}
              name="countryId"
              render={({ field }) => (
                <FormItem className="grid w-full grid-cols-4 items-center gap-4">
                  <FormLabel
                    required={true}
                    className="text-left"
                  >
                    Country
                  </FormLabel>
                  <FormControl className="col-span-3 w-full">
                    <GeneralCombobox
                      placeholder="Select a country..."
                      value={
                        field.value !== undefined && field.value !== null ? String(field.value) : ''
                      }
                      onChange={value => field.onChange(value)}
                      data={
                        augmentedCountries.length
                          ? augmentedCountries.map(country => ({
                              value: String(country.id),
                              label:
                                isEditMode &&
                                item &&
                                country.id === item.countryId &&
                                item.countryStatusEffective === 'inactive'
                                  ? `${country.name} (Inactive)`
                                  : country.name,
                              searchValue: country.name, // enables searching by name
                            }))
                          : [
                              {
                                value: '__no-country',
                                label: 'No active countries available',
                                disabled: true,
                              },
                            ]
                      }
                      className="w-full"
                      disabled={isPending || isLoadingCountries || augmentedCountries.length === 0}
                    />
                  </FormControl>
                  <FormMessage className="col-span-4" />
                </FormItem>
              )}
            />

            <RHFFormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel
                    required={true}
                    className="text-left"
                  >
                    Status
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending}
                  >
                    <FormControl className="col-span-3">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem
                        value="active"
                        disabled={!allowActiveState}
                      >
                        Active
                      </SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="col-span-4" />
                </FormItem>
              )}
            />
          </form>
        </Form>
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
            form="state-form"
            variant="solid"
            disabled={isPending || !form.formState.isDirty}
            isLoading={isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- City Dialog (Refactored) ---
// --- City Dialog (Fixed) ---
export function CityDialog({ open, onOpenChange, item }: DialogProps<CityResponse>) {
  const isEditMode = Boolean(item);
  const createMutation = useCreateCity();
  const updateMutation = useUpdateCity();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const { data: statesData, isLoading: isLoadingStates } = useGetAllStates();
  const states = useMemo<StateDropdownItem[]>(() => statesData?.items ?? [], [statesData]);

  const augmentedStates = useMemo<StateDropdownItem[]>(() => {
    if (!isEditMode || !item) return states;
    if (states.some(state => state.id === item.stateId)) return states;
    return [
      {
        id: item.stateId,
        name: item.stateName,
        status: item.stateStatus,
        countryId: item.countryId,
        statusEffective: item.stateStatusEffective,
      },
      ...states,
    ];
  }, [states, isEditMode, item]);

  // Fixed form type - remove the generic parameters
  const form = useForm<z.infer<typeof CreateCityFormSchema>>({
    resolver: zodResolver(CreateCityFormSchema),
    defaultValues: {
      name: '',
      stateId: '',
      status: 'active' as const,
    },
  });

  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          name: item.name,
          stateId: String(item.stateId),
          status: item.status,
        });
      } else {
        form.reset({
          name: '',
          stateId: '',
          status: 'active',
        });
      }
    }
  }, [open, item, form]);

  // Fixed useWatch - remove generic parameter
  const watchedStateId = useWatch({
    control: form.control,
    name: 'stateId',
  });

  const numericStateId = watchedStateId ? Number(watchedStateId) : undefined;
  const selectedStateActive = states.some(state => state.id === numericStateId);
  const allowActiveCity =
    selectedStateActive ||
    (isEditMode &&
      item !== null &&
      item.stateId === numericStateId &&
      item.stateStatusEffective === 'active' &&
      item.countryStatusEffective === 'active');

  const handleSubmit = (data: z.infer<typeof CreateCityFormSchema>) => {
    const submitData = CreateCity.parse(data);
    if (isEditMode && item) {
      updateMutation.mutate(
        { id: item.id, ...submitData },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(submitData, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit City' : 'Add City'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            id="city-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 py-4"
          >
            <RHFFormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel
                    required={true}
                    className="text-left"
                  >
                    City Name
                  </FormLabel>
                  <FormControl className="col-span-3">
                    <Input
                      {...field}
                      placeholder="e.g., Los Angeles"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage className="col-span-4" />
                </FormItem>
              )}
            />

            <RHFFormField
              control={form.control}
              name="stateId"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel
                    required={true}
                    className="text-left"
                  >
                    State
                  </FormLabel>

                  <FormControl className="col-span-3">
                    <GeneralCombobox
                      placeholder="Select a state..."
                      value={field.value ?? ''}
                      onChange={value => field.onChange(value)}
                      data={
                        augmentedStates.length > 0
                          ? augmentedStates.map(state => ({
                              value: String(state.id),
                              label:
                                state.name +
                                (isEditMode &&
                                item &&
                                state.id === item.stateId &&
                                (item.stateStatusEffective !== 'active' ||
                                  item.countryStatusEffective !== 'active')
                                  ? ' (Inactive)'
                                  : ''),
                              searchValue: state.name,
                            }))
                          : [
                              {
                                value: '__no-state',
                                label: 'No active states available',
                                searchValue: 'No active states available',
                              },
                            ]
                      }
                      className="w-full"
                      disabled={isPending || isLoadingStates || augmentedStates.length === 0}
                    />
                  </FormControl>

                  <FormMessage className="col-span-4" />
                </FormItem>
              )}
            />

            <RHFFormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel
                    required={true}
                    className="text-left"
                  >
                    Status
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending}
                  >
                    <FormControl className="col-span-3">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem
                        value="active"
                        disabled={!allowActiveCity}
                      >
                        Active
                      </SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="col-span-4" />
                </FormItem>
              )}
            />
          </form>
        </Form>
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
            form="city-form"
            variant="solid"
            disabled={isPending || !form.formState.isDirty}
            isLoading={isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
