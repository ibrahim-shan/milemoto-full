// src/features/checkout/components/AddressForm.tsx
'use client';

import * as React from 'react';

import { fetchCheckoutCities, fetchCheckoutCountries, fetchCheckoutStates } from '@/lib/locations';
import type { CityDropdownItem, CountryDropdownItem, StateDropdownItem } from '@/types';
import { GeneralCombobox } from '@/ui/combobox';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { PhoneField } from '@/ui/phone-field';

export type Address = {
  firstName: string;
  lastName: string;
  address: string;
  addressLine2: string;
  postalCode: string;
  country: string;
  countryId: string;
  city: string;
  cityId: string;
  state: string;
  stateId: string;
  email: string;
  phone: string;
};

type Props = {
  value: Address;
  onChange: (next: Address) => void;
};

function normalizePlaceName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b(governorate|province|state|region)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findNameMatch<T extends { name: string }>(items: T[], rawName: string): T | undefined {
  const target = normalizePlaceName(rawName);
  if (!target) return undefined;

  const exact = items.find(it => normalizePlaceName(it.name) === target);
  if (exact) return exact;

  return items.find(it => {
    const candidate = normalizePlaceName(it.name);
    return candidate.includes(target) || target.includes(candidate);
  });
}

export default function AddressForm({ value, onChange }: Props) {
  const [countries, setCountries] = React.useState<CountryDropdownItem[]>([]);
  const [states, setStates] = React.useState<StateDropdownItem[]>([]);
  const [cities, setCities] = React.useState<CityDropdownItem[]>([]);
  const [loadingCountries, setLoadingCountries] = React.useState(false);
  const [loadingStates, setLoadingStates] = React.useState(false);
  const [loadingCities, setLoadingCities] = React.useState(false);

  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });

  const setCountry = (countryId: string) => {
    const country = countries.find(it => String(it.id) === countryId);
    onChange({
      ...value,
      countryId,
      country: country?.name ?? '',
      stateId: '',
      state: '',
      cityId: '',
      city: '',
    });
  };

  const setState = (stateId: string) => {
    const state = states.find(it => String(it.id) === stateId);
    onChange({
      ...value,
      stateId,
      state: state?.name ?? '',
      cityId: '',
      city: '',
    });
  };

  const setCity = (cityId: string) => {
    const city = cities.find(it => String(it.id) === cityId);
    onChange({
      ...value,
      cityId,
      city: city?.name ?? '',
    });
  };

  const ids = {
    first: React.useId(),
    last: React.useId(),
    phone: React.useId(),
    email: React.useId(),
    country: React.useId(),
    state: React.useId(),
    city: React.useId(),
    postal: React.useId(),
    addr: React.useId(),
    addr2: React.useId(),
  };

  React.useEffect(() => {
    let active = true;
    setLoadingCountries(true);
    void fetchCheckoutCountries()
      .then(res => {
        if (!active) return;
        setCountries(res.items);
      })
      .finally(() => {
        if (!active) return;
        setLoadingCountries(false);
      });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    const countryIdNum = Number(value.countryId);
    if (!countryIdNum) {
      setStates([]);
      setCities([]);
      return;
    }

    let active = true;
    setLoadingStates(true);
    setCities([]);
    void fetchCheckoutStates(countryIdNum)
      .then(res => {
        if (!active) return;
        setStates(res.items);
      })
      .finally(() => {
        if (!active) return;
        setLoadingStates(false);
      });

    return () => {
      active = false;
    };
  }, [value.countryId]);

  React.useEffect(() => {
    const stateIdNum = Number(value.stateId);
    if (!stateIdNum) {
      setCities([]);
      return;
    }

    let active = true;
    setLoadingCities(true);
    void fetchCheckoutCities(stateIdNum)
      .then(res => {
        if (!active) return;
        setCities(res.items);
      })
      .finally(() => {
        if (!active) return;
        setLoadingCities(false);
      });

    return () => {
      active = false;
    };
  }, [value.stateId]);

  React.useEffect(() => {
    if (countries.length === 0) return;
    if (value.countryId && countries.some(it => String(it.id) === value.countryId)) return;
    if (!value.countryId) return;
    onChange({
      ...value,
      countryId: '',
      country: '',
      stateId: '',
      state: '',
      cityId: '',
      city: '',
    });
  }, [countries, onChange, value]);

  // Legacy/backfill support: if names are saved but IDs are missing, infer IDs from dropdown data.
  React.useEffect(() => {
    if (value.countryId || !value.country.trim() || countries.length === 0) return;
    const match = findNameMatch(countries, value.country);
    if (!match) return;
    onChange({
      ...value,
      countryId: String(match.id),
    });
  }, [countries, onChange, value]);

  React.useEffect(() => {
    if (states.length === 0) return;
    if (!value.stateId) return;
    if (states.some(it => String(it.id) === value.stateId)) return;
    onChange({
      ...value,
      stateId: '',
      state: '',
      cityId: '',
      city: '',
    });
  }, [states, onChange, value]);

  React.useEffect(() => {
    if (value.stateId || !value.state.trim() || states.length === 0) return;
    const match = findNameMatch(states, value.state);
    if (!match) return;
    onChange({
      ...value,
      stateId: String(match.id),
    });
  }, [states, onChange, value]);

  React.useEffect(() => {
    if (cities.length === 0) return;
    if (!value.cityId) return;
    if (cities.some(it => String(it.id) === value.cityId)) return;
    onChange({
      ...value,
      cityId: '',
      city: '',
    });
  }, [cities, onChange, value]);

  React.useEffect(() => {
    if (value.cityId || !value.city.trim() || cities.length === 0) return;
    const match = findNameMatch(cities, value.city);
    if (!match) return;
    onChange({
      ...value,
      cityId: String(match.id),
    });
  }, [cities, onChange, value]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field
        label="First Name"
        htmlFor={ids.first}
        required
      >
        <Input
          id={ids.first}
          name="given-name"
          autoComplete="given-name"
          autoCapitalize="words"
          value={value.firstName}
          onChange={set('firstName')}
          placeholder="John"
        />
      </Field>
      <Field
        label="Last Name"
        htmlFor={ids.last}
        required
      >
        <Input
          id={ids.last}
          name="family-name"
          autoComplete="family-name"
          autoCapitalize="words"
          value={value.lastName}
          onChange={set('lastName')}
          placeholder="Doe"
        />
      </Field>
      <Field
        label="Phone Number"
        htmlFor={ids.phone}
        required
      >
        <PhoneField
          id={ids.phone}
          value={value.phone}
          onChange={nextValue => onChange({ ...value, phone: nextValue })}
          required
          placeholder="70 123 456"
        />
      </Field>
      <Field
        label="Email"
        htmlFor={ids.email}
      >
        <Input
          id={ids.email}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={value.email}
          onChange={set('email')}
          placeholder="you@example.com"
        />
      </Field>
      <Field
        label="Country"
        htmlFor={ids.country}
        required
      >
        <GeneralCombobox
          id={ids.country}
          {...(value.countryId ? { value: value.countryId } : {})}
          onChange={next => setCountry(String(next))}
          disabled={loadingCountries}
          placeholder={
            loadingCountries
              ? 'Loading countries...'
              : value.country && !value.countryId
                ? value.country
                : 'Select country'
          }
          emptyMessage="No countries found."
          data={countries.map(country => ({
            value: String(country.id),
            label: country.name,
          }))}
        />
      </Field>
      <Field
        label="State/Region"
        htmlFor={ids.state}
        required
      >
        <GeneralCombobox
          id={ids.state}
          {...(value.stateId ? { value: value.stateId } : {})}
          onChange={next => setState(String(next))}
          disabled={!value.countryId || loadingStates}
          placeholder={
            !value.countryId
              ? value.state && !value.stateId
                ? value.state
                : 'Select country first'
              : loadingStates
                ? 'Loading states...'
                : 'Select state'
          }
          emptyMessage="No states found."
          data={states.map(state => ({
            value: String(state.id),
            label: state.name,
          }))}
        />
      </Field>
      <Field
        label="City/Town"
        htmlFor={ids.city}
        required
      >
        <GeneralCombobox
          id={ids.city}
          {...(value.cityId ? { value: value.cityId } : {})}
          onChange={next => setCity(String(next))}
          disabled={!value.stateId || loadingCities}
          placeholder={
            !value.stateId
              ? value.city && !value.cityId
                ? value.city
                : 'Select state first'
              : loadingCities
                ? 'Loading cities...'
                : 'Select city'
          }
          emptyMessage="No cities found."
          data={cities.map(city => ({
            value: String(city.id),
            label: city.name,
          }))}
        />
      </Field>
      <Field
        label="Postal Code"
        htmlFor={ids.postal}
        optional
      >
        <Input
          id={ids.postal}
          name="postal-code"
          autoComplete="postal-code"
          value={value.postalCode}
          onChange={set('postalCode')}
          placeholder="Postal code (optional)"
        />
      </Field>
      <Field
        label="Address Line 1"
        htmlFor={ids.addr}
        full
        required
      >
        <Input
          id={ids.addr}
          name="street-address"
          autoComplete="street-address"
          value={value.address}
          onChange={set('address')}
          placeholder="Street, building, floor"
        />
      </Field>
      <Field
        label="Address Line 2"
        htmlFor={ids.addr2}
        full
        optional
      >
        <Input
          id={ids.addr2}
          name="address-line2"
          autoComplete="address-line2"
          value={value.addressLine2}
          onChange={set('addressLine2')}
          placeholder="Apartment, suite, landmark (optional)"
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
  full = false,
  required = false,
  optional = false,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  full?: boolean;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <Label
        htmlFor={htmlFor}
        required={required}
        className="text-foreground mb-1 block text-sm"
      >
        {label}
        {optional ? <span className="text-muted-foreground ml-1">(optional)</span> : null}
      </Label>
      {children}
    </div>
  );
}
