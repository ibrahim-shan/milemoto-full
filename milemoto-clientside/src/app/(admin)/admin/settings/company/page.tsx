'use client';

import { useEffect, useMemo, useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { CompanyProfileInput, type CompanyProfileInputDto } from '@milemoto/types';
import { useForm, useFormContext } from 'react-hook-form';

import { Skeleton } from '@/features/feedback/Skeleton';
import { useGetCompanyProfile, useUpdateCompanyProfile } from '@/hooks/useCompanyProfileQueries';
import { useGetAllCountries } from '@/hooks/useLocationQueries';
import { Button } from '@/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/ui/card';
import { GeneralCombobox } from '@/ui/combobox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/ui/form';
import { Input } from '@/ui/input';

type FormTextFieldProps = {
  name: keyof CompanyProfileInputDto;
  label: string;
  placeholder?: string;
  type?: string;
  transform?: (value: string) => string | null;
  disabled?: boolean;
};

function FormTextField({
  name,
  label,
  placeholder,
  type = 'text',
  transform,
  disabled = false,
}: FormTextFieldProps) {
  const { control } = useFormContext<CompanyProfileInputDto>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              value={field.value ?? ''}
              onChange={event => field.onChange(event.target.value)}
              onBlur={event => {
                field.onBlur();
                if (!transform) return;
                field.onChange(transform(event.target.value));
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

const DEFAULT_VALUES: CompanyProfileInputDto = {
  name: '',
  publicEmail: null,
  phone: null,
  website: null,
  address: null,
  city: null,
  state: null,
  zip: null,
  countryId: null,
  latitude: null,
  longitude: null,
};

function sanitizeNumberInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function formatCountryLabel(country: { name: string; status?: 'active' | 'inactive' | null }) {
  return country.status === 'inactive' ? `${country.name} (inactive)` : country.name;
}

export default function CompanyPage() {
  const { data, isLoading } = useGetCompanyProfile();
  const { data: countriesData, isLoading: isLoadingCountries } = useGetAllCountries(true);
  const updateMutation = useUpdateCompanyProfile();
  const latitudeInputRef = useRef<HTMLInputElement | null>(null);
  const longitudeInputRef = useRef<HTMLInputElement | null>(null);
  const prevLatitudeValueRef = useRef('');
  const prevLongitudeValueRef = useRef('');

  const form = useForm({
    resolver: zodResolver(CompanyProfileInput),
    defaultValues: DEFAULT_VALUES,
  });

  const countries = useMemo(() => {
    const items = countriesData?.items ?? [];
    if (data?.countryId && !items.some(country => country.id === Number(data.countryId))) {
      return [
        {
          id: data.countryId,
          name: data.countryName ?? `Country #${data.countryId}`,
          status: data.countryStatus ?? 'inactive',
        },
        ...items,
      ];
    }
    return items;
  }, [countriesData, data]);

  useEffect(() => {
    // Wait until both queries are finished
    const queriesFinished = !isLoading && !isLoadingCountries;
    if (!queriesFinished) {
      return; // Do nothing if *either* is still loading
    }

    // At this point, both are done.
    if (data) {
      const latString =
        data.latitude !== null && data.latitude !== undefined ? String(data.latitude) : '';
      const lngString =
        data.longitude !== null && data.longitude !== undefined ? String(data.longitude) : '';
      if (latitudeInputRef.current) latitudeInputRef.current.value = latString;
      if (longitudeInputRef.current) longitudeInputRef.current.value = lngString;
      prevLatitudeValueRef.current = latString;
      prevLongitudeValueRef.current = lngString;
      form.reset({
        name: data.name ?? '',
        publicEmail: data.publicEmail ?? null,
        phone: data.phone ?? null,
        website: data.website ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zip: data.zip ?? null,
        countryId: data.countryId ? String(data.countryId) : '', // Use '' for empty string
        latitude:
          data.latitude !== null && data.latitude !== undefined ? Number(data.latitude) : null,
        longitude:
          data.longitude !== null && data.longitude !== undefined ? Number(data.longitude) : null,
      });
    } else {
      if (latitudeInputRef.current) latitudeInputRef.current.value = '';
      if (longitudeInputRef.current) longitudeInputRef.current.value = '';
      prevLatitudeValueRef.current = '';
      prevLongitudeValueRef.current = '';
      form.reset(DEFAULT_VALUES);
    }
  }, [
    data,
    isLoading,
    countriesData, // This dep ensures useMemo has the data
    isLoadingCountries,
    form,
  ]);

  const handleSubmit = (values: CompanyProfileInputDto) => {
    const dataForApi: CompanyProfileInputDto = {
      ...values,
      countryId: values.countryId ? Number(values.countryId) : null,
    };
    updateMutation.mutate(dataForApi);
  };

  const isPending = updateMutation.isPending;
  const disableSubmit = isPending || !form.formState.isDirty;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || isLoadingCountries ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {Array.from({ length: 12 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-14"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <FormTextField
                    name="name"
                    label="Company Name"
                    transform={value => value.trim()}
                    disabled={isPending}
                  />
                  <FormTextField
                    name="publicEmail"
                    label="Public Email"
                    type="email"
                    transform={sanitizeOptionalText}
                    disabled={isPending}
                  />
                  <FormTextField
                    name="phone"
                    label="Phone Number"
                    transform={sanitizeOptionalText}
                    disabled={isPending}
                  />
                  <FormTextField
                    name="website"
                    label="Website"
                    type="url"
                    transform={sanitizeOptionalText}
                    disabled={isPending}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 25.1972"
                              disabled={isPending}
                              inputMode="decimal"
                              ref={el => {
                                latitudeInputRef.current = el;
                              }}
                              defaultValue={field.value ?? ''}
                              onFocus={event => {
                                prevLatitudeValueRef.current = event.currentTarget.value;
                              }}
                              onChange={event => {
                                const next = event.currentTarget.value;
                                if (!/^-?\d*(\.\d*)?$/.test(next)) {
                                  event.currentTarget.value = prevLatitudeValueRef.current;
                                  return;
                                }
                                prevLatitudeValueRef.current = next;
                                const parsed = sanitizeNumberInput(next);
                                if (parsed !== null || next.trim() === '') {
                                  field.onChange(parsed);
                                }
                              }}
                              onBlur={event => {
                                field.onBlur();
                                const parsed = sanitizeNumberInput(event.currentTarget.value);
                                field.onChange(parsed);
                                if (parsed === null) {
                                  event.currentTarget.value = '';
                                  prevLatitudeValueRef.current = '';
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 55.2744"
                              disabled={isPending}
                              inputMode="decimal"
                              ref={el => {
                                longitudeInputRef.current = el;
                              }}
                              defaultValue={field.value ?? ''}
                              onFocus={event => {
                                prevLongitudeValueRef.current = event.currentTarget.value;
                              }}
                              onChange={event => {
                                const next = event.currentTarget.value;
                                if (!/^-?\d*(\.\d*)?$/.test(next)) {
                                  event.currentTarget.value = prevLongitudeValueRef.current;
                                  return;
                                }
                                prevLongitudeValueRef.current = next;
                                const parsed = sanitizeNumberInput(next);
                                if (parsed !== null || next.trim() === '') {
                                  field.onChange(parsed);
                                }
                              }}
                              onBlur={event => {
                                field.onBlur();
                                const parsed = sanitizeNumberInput(event.currentTarget.value);
                                field.onChange(parsed);
                                if (parsed === null) {
                                  event.currentTarget.value = '';
                                  prevLongitudeValueRef.current = '';
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <FormTextField
                    name="address"
                    label="Address"
                    transform={sanitizeOptionalText}
                    placeholder="Street and number"
                    disabled={isPending}
                  />

                  <FormTextField
                    name="city"
                    label="City"
                    transform={sanitizeOptionalText}
                    disabled={isPending}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormTextField
                      name="state"
                      label="State / Province"
                      transform={sanitizeOptionalText}
                      disabled={isPending}
                    />
                    <FormTextField
                      name="zip"
                      label="Zip / Postal Code"
                      transform={sanitizeOptionalText}
                      disabled={isPending}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="countryId"
                    render={({ field }) => {
                      return (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <GeneralCombobox
                              placeholder="Select country"
                              data={countries.map(country => ({
                                value: String(country.id),
                                label: formatCountryLabel(country),
                                searchValue: country.name, // optional, used for search
                              }))}
                              value={
                                field.value !== undefined && field.value !== null
                                  ? String(field.value)
                                  : ''
                              }
                              onChange={value => field.onChange(value)}
                              disabled={isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              type="submit"
              variant="solid"
              disabled={disableSubmit}
              isLoading={isPending}
            >
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
