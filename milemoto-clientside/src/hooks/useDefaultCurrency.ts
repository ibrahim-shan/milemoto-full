import { useMemo } from 'react';

import { useGetActiveCurrencies } from './useCurrencyQueries';
import { useGetStoreCurrencySettings } from './useSiteSettingsQueries';

/**
 * Hook to get the default currency symbol, position, and decimal digits from site settings
 * Returns the currency symbol (e.g., "$", "€", "£"), position ("before" or "after"), and decimal digits
 */
export function useDefaultCurrency() {
  const { data: storeCurrencySettings, isLoading: isLoadingSettings } =
    useGetStoreCurrencySettings();
  const { data: currencies, isLoading: isLoadingCurrencies } = useGetActiveCurrencies();

  const defaultCurrency = useMemo(() => {
    if (!storeCurrencySettings || !currencies) {
      return { symbol: '$', code: 'USD', position: 'before', decimals: 2, isLoading: true };
    }

    const currency = currencies.find(c => c.id === storeCurrencySettings.defaultCurrencyId);

    return {
      symbol: currency?.symbol || '$',
      code: currency?.code || 'USD',
      name: currency?.name || 'US Dollar',
      id: currency?.id || storeCurrencySettings.defaultCurrencyId,
      position: storeCurrencySettings.currencyPosition || 'before',
      decimals: storeCurrencySettings.decimalDigits || 2,
      isLoading: false,
    };
  }, [storeCurrencySettings, currencies]);

  const formatCurrency = (value: number | string | undefined | null) => {
    if (value === undefined || value === null || value === '') return '-';
    const num = Number(value);
    if (isNaN(num)) return '-';
    const formatted = num.toFixed(defaultCurrency.decimals);
    return defaultCurrency.position === 'before'
      ? `${defaultCurrency.symbol} ${formatted}`
      : `${formatted} ${defaultCurrency.symbol}`;
  };

  return {
    ...defaultCurrency,
    formatCurrency,
    isLoading: isLoadingSettings || isLoadingCurrencies,
  };
}
