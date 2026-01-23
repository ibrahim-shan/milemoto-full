'use client';

import { useEffect, useMemo, useState } from 'react';

import { FormField } from './shared'; // Import from shared file

import { Skeleton } from '@/features/feedback/Skeleton';
import { useGetActiveCurrencies } from '@/hooks/useCurrencyQueries';
import {
  useGetStoreCurrencySettings,
  useUpdateStoreCurrencySettings,
} from '@/hooks/useSiteSettingsQueries';
import { Button } from '@/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { GeneralCombobox } from '@/ui/combobox';
import { Input } from '@/ui/input';

export function StoreCurrencyCard() {
  // Fetch store/currency settings
  const { data: storeCurrencyData, isLoading: isLoadingStoreCurrency } =
    useGetStoreCurrencySettings();
  const { data: activeCurrencies = [], isLoading: isLoadingCurrencies } = useGetActiveCurrencies();
  const updateStoreCurrency = useUpdateStoreCurrencySettings();

  // --- Store & Currency Form State ---
  const initialStoreCurrency = useMemo(
    () => ({
      currencyId: storeCurrencyData?.defaultCurrencyId || 1,
      currencyPosition: storeCurrencyData?.currencyPosition || 'before',
      decimals: storeCurrencyData?.decimalDigits || 2,
      copyright: storeCurrencyData?.copyrightText || '© 2025 MileMoto. All rights reserved.',
    }),
    [storeCurrencyData],
  );

  const [currencyId, setCurrencyId] = useState(initialStoreCurrency.currencyId);
  const [currencyPosition, setCurrencyPosition] = useState(initialStoreCurrency.currencyPosition);
  const [decimals, setDecimals] = useState(initialStoreCurrency.decimals);
  const [copyright, setCopyright] = useState(initialStoreCurrency.copyright);

  // Sync state when data loads from API
  useEffect(() => {
    setCurrencyId(initialStoreCurrency.currencyId);
    setCurrencyPosition(initialStoreCurrency.currencyPosition);
    setDecimals(initialStoreCurrency.decimals);
    setCopyright(initialStoreCurrency.copyright);
  }, [initialStoreCurrency]);

  // Check if store/currency settings have changed
  const isStoreCurrencyDirty = storeCurrencyData
    ? currencyId !== initialStoreCurrency.currencyId ||
      currencyPosition !== initialStoreCurrency.currencyPosition ||
      decimals !== initialStoreCurrency.decimals ||
      copyright !== initialStoreCurrency.copyright
    : false;

  const handleStoreCurrencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isStoreCurrencyDirty) {
      await updateStoreCurrency.mutateAsync({
        defaultCurrencyId: currencyId,
        currencyPosition: currencyPosition as 'before' | 'after',
        decimalDigits: decimals,
        copyrightText: copyright,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store & Currency</CardTitle>
        <CardDescription>Manage your store&apos;s financial and branding details.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingStoreCurrency || isLoadingCurrencies ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        ) : (
          /* Using `key` here is the React-idiomatic way to reset state when data loads.
             When `storeCurrencyData.id` (or similar stable ID) changes, or when we go from
             loading to loaded, this key changes, forcing React to remount the form
             and initialize `useState` with the fresh `initialStoreCurrency`.
             
             If storeCurrencyData doesn't have a unique ID that changes, using a JSON string
             of the initial values is a safe (albeit slightly heavier) fallback for the key.
          */
          <form
            key={JSON.stringify(initialStoreCurrency)}
            onSubmit={handleStoreCurrencySubmit}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                id="defaultCurrency"
                label="Default Currency"
              >
                <GeneralCombobox
                  id="defaultCurrency"
                  data={activeCurrencies.map(currency => ({
                    value: currency.id,
                    label: `${currency.code} (${currency.symbol})`,
                    searchValue: currency.code,
                  }))}
                  placeholder="Select currency"
                  value={currencyId}
                  onChange={value => setCurrencyId(Number(value))}
                />
              </FormField>

              <FormField
                id="currencyPosition"
                label="Currency Position"
              >
                <GeneralCombobox
                  id="currencyPosition"
                  data={[
                    { value: 'before', label: 'Before ($10.00)' },
                    { value: 'after', label: 'After (10.00$)' },
                  ]}
                  placeholder="Select position"
                  value={currencyPosition}
                  onChange={value => setCurrencyPosition(value as 'before' | 'after')}
                />
              </FormField>

              <FormField
                id="decimals"
                label="Digits After Decimal"
                className="md:col-span-2"
              >
                <Input
                  id="decimals"
                  type="text"
                  inputMode="numeric"
                  value={decimals}
                  onChange={e => setDecimals(parseInt(e.target.value) || 0)}
                />
              </FormField>

              <FormField
                id="copyright"
                label="Copyright Text"
                className="md:col-span-2"
              >
                <Input
                  id="copyright"
                  type="text"
                  value={copyright}
                  onChange={e => setCopyright(e.target.value)}
                />
              </FormField>
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button
                type="submit"
                variant="solid"
                disabled={!isStoreCurrencyDirty || updateStoreCurrency.isPending}
                onClick={handleStoreCurrencySubmit}
              >
                {updateStoreCurrency.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
