'use client';

import * as React from 'react';

import { toast } from 'sonner';

import AddressForm, { type Address } from '@/features/checkout/components/AddressForm';
import { useAuth } from '@/hooks/useAuth';
import { updateMyAddress } from '@/lib/auth';
import { Button } from '@/ui/button';

function emptyAddress(): Address {
  return {
    firstName: '',
    lastName: '',
    address: '',
    addressLine2: '',
    postalCode: '',
    country: '',
    countryId: '',
    city: '',
    cityId: '',
    state: '',
    stateId: '',
    email: '',
    phone: '',
  };
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

function toFormAddress(user: ReturnType<typeof useAuth>['user']): Address {
  const saved = user?.defaultShippingAddress;
  if (!saved) return emptyAddress();
  const { firstName, lastName } = splitName(saved.fullName);
  return {
    firstName,
    lastName,
    address: saved.addressLine1,
    addressLine2: saved.addressLine2 ?? '',
    postalCode: saved.postalCode ?? '',
    country: saved.country,
    countryId: saved.countryId ? String(saved.countryId) : '',
    city: saved.city,
    cityId: saved.cityId ? String(saved.cityId) : '',
    state: saved.state,
    stateId: saved.stateId ? String(saved.stateId) : '',
    email: saved.email ?? '',
    phone: saved.phone,
  };
}

function normalizeAddressForCompare(v: Address): Address {
  return {
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    address: v.address.trim(),
    addressLine2: v.addressLine2.trim(),
    postalCode: v.postalCode.trim(),
    country: v.country.trim(),
    countryId: v.countryId,
    city: v.city.trim(),
    cityId: v.cityId,
    state: v.state.trim(),
    stateId: v.stateId,
    email: v.email.trim(),
    phone: v.phone.trim(),
  };
}

export default function AddressPage() {
  const { user, loading, isAuthenticated, updateUser } = useAuth();
  const [value, setValue] = React.useState<Address>(emptyAddress);
  const [saving, setSaving] = React.useState(false);

  const initialValue = React.useMemo(() => (user ? toFormAddress(user) : emptyAddress()), [user]);
  const isDirty = React.useMemo(
    () =>
      JSON.stringify(normalizeAddressForCompare(value)) !==
      JSON.stringify(normalizeAddressForCompare(initialValue)),
    [initialValue, value],
  );

  React.useEffect(() => {
    if (!user) return;
    setValue(toFormAddress(user));
  }, [user]);

  const validate = React.useCallback((v: Address) => {
    if (!v.firstName.trim()) return 'First name is required.';
    if (!v.lastName.trim()) return 'Last name is required.';
    if (!v.phone.trim()) return 'Phone is required.';
    if (!v.countryId || !v.country.trim()) return 'Country is required.';
    if (!v.stateId || !v.state.trim()) return 'State is required.';
    if (!v.cityId || !v.city.trim()) return 'City is required.';
    if (!v.address.trim()) return 'Address line 1 is required.';
    if (v.email.trim() && !v.email.includes('@')) return 'Enter a valid email.';
    return null;
  }, []);

  const onSave = React.useCallback(async () => {
    if (!isAuthenticated) return;
    const errMsg = validate(value);
    if (errMsg) {
      toast.error(errMsg);
      return;
    }
    setSaving(true);
    try {
      const userResp = await updateMyAddress({
        fullName: `${value.firstName} ${value.lastName}`.trim(),
        phone: value.phone.trim(),
        email: value.email.trim() ? value.email.trim() : null,
        country: value.country.trim(),
        countryId: value.countryId ? Number(value.countryId) : null,
        state: value.state.trim(),
        stateId: value.stateId ? Number(value.stateId) : null,
        city: value.city.trim(),
        cityId: value.cityId ? Number(value.cityId) : null,
        addressLine1: value.address.trim(),
        addressLine2: value.addressLine2.trim() ? value.addressLine2.trim() : null,
        postalCode: value.postalCode.trim() ? value.postalCode.trim() : null,
      });
      updateUser(() => userResp);
      toast.success('Address saved.');
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  }, [isAuthenticated, updateUser, validate, value]);

  if (loading) {
    return (
      <article className="border-border/60 bg-card rounded-xl border p-6">
        <p className="text-muted-foreground text-sm">Loading address...</p>
      </article>
    );
  }

  if (!isAuthenticated) {
    return (
      <article className="border-border/60 bg-card rounded-xl border p-6">
        <h2 className="text-xl font-semibold tracking-tight">My Address</h2>
        <p className="text-muted-foreground mt-2 text-sm">Please sign in to manage your address.</p>
      </article>
    );
  }

  return (
    <article className="border-border/60 bg-card rounded-xl border p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold tracking-tight">My Address</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          This address will be prefilled during checkout and can be edited there per order.
        </p>
      </div>

      <AddressForm
        value={value}
        onChange={setValue}
      />

      <div className="mt-6 flex justify-end">
        <Button
          onClick={onSave}
          disabled={saving || !isDirty}
        >
          {saving ? 'Saving...' : 'Save Address'}
        </Button>
      </div>
    </article>
  );
}
