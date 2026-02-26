'use client';

import { useEffect, useMemo, useState } from 'react';

import { SwitchRow } from './shared';

import { Skeleton } from '@/features/feedback/Skeleton';
import {
  useGetTaxPolicySettings,
  useUpdateTaxPolicySettings,
} from '@/hooks/useSiteSettingsQueries';
import { Button } from '@/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { Input } from '@/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';

export function TaxPolicyCard() {
  const { data: settings, isLoading } = useGetTaxPolicySettings();
  const updateSettings = useUpdateTaxPolicySettings();

  const initialSettings = useMemo(
    () => ({
      jurisdictionSource: settings?.jurisdictionSource ?? ('shipping_country' as const),
      taxableBaseMode: settings?.taxableBaseMode ?? ('subtotal_minus_discount' as const),
      shippingTaxable: settings?.shippingTaxable ?? false,
      roundingPrecision: settings?.roundingPrecision ?? 2,
      combinationMode: settings?.combinationMode ?? ('stack' as const),
      fallbackMode: settings?.fallbackMode ?? ('no_tax' as const),
    }),
    [settings],
  );

  const [jurisdictionSource, setJurisdictionSource] = useState(initialSettings.jurisdictionSource);
  const [taxableBaseMode, setTaxableBaseMode] = useState(initialSettings.taxableBaseMode);
  const [shippingTaxable, setShippingTaxable] = useState(initialSettings.shippingTaxable);
  const [roundingPrecision, setRoundingPrecision] = useState(
    String(initialSettings.roundingPrecision),
  );
  const [combinationMode, setCombinationMode] = useState(initialSettings.combinationMode);
  const [fallbackMode, setFallbackMode] = useState(initialSettings.fallbackMode);

  useEffect(() => {
    setJurisdictionSource(initialSettings.jurisdictionSource);
    setTaxableBaseMode(initialSettings.taxableBaseMode);
    setShippingTaxable(initialSettings.shippingTaxable);
    setRoundingPrecision(String(initialSettings.roundingPrecision));
    setCombinationMode(initialSettings.combinationMode);
    setFallbackMode(initialSettings.fallbackMode);
  }, [initialSettings]);

  const parsedRoundingPrecision = Number.parseInt(roundingPrecision, 10);
  const roundingPrecisionValid =
    Number.isInteger(parsedRoundingPrecision) &&
    parsedRoundingPrecision >= 0 &&
    parsedRoundingPrecision <= 4;

  const isDirty =
    !!settings &&
    (jurisdictionSource !== initialSettings.jurisdictionSource ||
      taxableBaseMode !== initialSettings.taxableBaseMode ||
      shippingTaxable !== initialSettings.shippingTaxable ||
      String(initialSettings.roundingPrecision) !== roundingPrecision ||
      combinationMode !== initialSettings.combinationMode ||
      fallbackMode !== initialSettings.fallbackMode);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!roundingPrecisionValid) return;
    if (!isDirty) return;

    await updateSettings.mutateAsync({
      jurisdictionSource,
      taxableBaseMode,
      shippingTaxable,
      roundingPrecision: parsedRoundingPrecision,
      combinationMode,
      fallbackMode,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Policy</CardTitle>
        <CardDescription>Manage how checkout applies tax rules.</CardDescription>
        <CardDescription>
          Configure how checkout applies tax rules. This controls policy, while the Taxes page
          controls rule data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-12 w-full"
              />
            ))}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="taxJurisdictionSource"
                  className="text-sm font-medium"
                >
                  Jurisdiction Source
                </label>
                <Select
                  value={jurisdictionSource}
                  onValueChange={value =>
                    setJurisdictionSource(value as 'shipping_country' | 'billing_country')
                  }
                >
                  <SelectTrigger id="taxJurisdictionSource">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shipping_country">Shipping Country</SelectItem>
                    <SelectItem value="billing_country">Billing Country</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="taxTaxableBaseMode"
                  className="text-sm font-medium"
                >
                  Taxable Base
                </label>
                <Select
                  value={taxableBaseMode}
                  onValueChange={value =>
                    setTaxableBaseMode(value as 'subtotal' | 'subtotal_minus_discount')
                  }
                >
                  <SelectTrigger id="taxTaxableBaseMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subtotal">Subtotal</SelectItem>
                    <SelectItem value="subtotal_minus_discount">Subtotal - Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="taxRoundingPrecision"
                  className="text-sm font-medium"
                >
                  Rounding Precision
                </label>
                <Input
                  id="taxRoundingPrecision"
                  type="number"
                  min="0"
                  max="4"
                  step="1"
                  value={roundingPrecision}
                  onChange={e => setRoundingPrecision(e.target.value)}
                />
                {!roundingPrecisionValid ? (
                  <p className="text-xs text-red-600">Enter an integer between 0 and 4.</p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Current checkout rounding uses this precision for tax line and total amounts.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="taxCombinationMode"
                  className="text-sm font-medium"
                >
                  Combination Mode
                </label>
                <Select
                  value={combinationMode}
                  onValueChange={value => setCombinationMode(value as 'stack' | 'exclusive')}
                >
                  <SelectTrigger id="taxCombinationMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stack">Stack (sum matching rules)</SelectItem>
                    <SelectItem value="exclusive">Exclusive (single best match)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  `Exclusive` applies a single best match (country-specific rules take priority over
                  global rules).
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="taxFallbackMode"
                  className="text-sm font-medium"
                >
                  Fallback Mode
                </label>
                <Select
                  value={fallbackMode}
                  onValueChange={value => setFallbackMode(value as 'no_tax' | 'block_checkout')}
                >
                  <SelectTrigger id="taxFallbackMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_tax">No Tax (allow checkout)</SelectItem>
                    <SelectItem value="block_checkout">Block Checkout</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  `Block Checkout` requires a jurisdiction country and at least one matching active
                  tax rule.
                </p>
              </div>
            </div>

            <SwitchRow
              id="shippingTaxable"
              label="Tax Shipping"
              description="If enabled, shipping cost is included in the taxable base."
              checked={shippingTaxable}
              onCheckedChange={setShippingTaxable}
            />

            <div className="flex justify-end border-t pt-4">
              <Button
                type="submit"
                variant="solid"
                disabled={!isDirty || !roundingPrecisionValid || updateSettings.isPending}
              >
                {updateSettings.isPending ? 'Saving...' : 'Save Tax Policy'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default TaxPolicyCard;
