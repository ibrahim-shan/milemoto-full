'use client';

import { useEffect, useMemo, useState } from 'react';

import { Skeleton } from '@/features/feedback/Skeleton';
import {
  useGetStockDisplaySettings,
  useUpdateStockDisplaySettings,
} from '@/hooks/useSiteSettingsQueries';
import { Button } from '@/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { Input } from '@/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';

export function StockDisplayCard() {
  const { data: settings, isLoading } = useGetStockDisplaySettings();
  const updateSettings = useUpdateStockDisplaySettings();

  const initialSettings = useMemo(
    () => ({
      productStockDisplayMode: settings?.productStockDisplayMode ?? ('low_stock_only' as const),
      lowStockThreshold: settings?.lowStockThreshold ?? 5,
    }),
    [settings],
  );

  const [mode, setMode] = useState(initialSettings.productStockDisplayMode);
  const [lowStockThreshold, setLowStockThreshold] = useState(
    String(initialSettings.lowStockThreshold),
  );

  useEffect(() => {
    setMode(initialSettings.productStockDisplayMode);
    setLowStockThreshold(String(initialSettings.lowStockThreshold));
  }, [initialSettings]);

  const parsedThreshold = Number.parseInt(lowStockThreshold, 10);
  const thresholdValid =
    Number.isInteger(parsedThreshold) && parsedThreshold >= 1 && parsedThreshold <= 100;

  const isDirty =
    !!settings &&
    (mode !== initialSettings.productStockDisplayMode ||
      String(initialSettings.lowStockThreshold) !== lowStockThreshold);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!thresholdValid || !isDirty) return;
    await updateSettings.mutateAsync({
      productStockDisplayMode: mode,
      lowStockThreshold: parsedThreshold,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Display</CardTitle>
        <CardDescription>
          Control how product stock availability appears on the storefront product page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
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
            <div className="space-y-2">
              <label
                htmlFor="productStockDisplayMode"
                className="text-sm font-medium"
              >
                Product Stock Display Mode
              </label>
              <Select
                value={mode}
                onValueChange={value =>
                  setMode(value as 'exact' | 'low_stock_only' | 'binary' | 'hide')
                }
              >
                <SelectTrigger id="productStockDisplayMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exact">Exact</SelectItem>
                  <SelectItem value="low_stock_only">Low-stock only (recommended)</SelectItem>
                  <SelectItem value="binary">Binary (In stock / Out of stock)</SelectItem>
                  <SelectItem value="hide">Hide stock messages</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Exact shows counts. Low-stock only shows exact counts only below the threshold.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="lowStockThreshold"
                className="text-sm font-medium"
              >
                Low Stock Threshold
              </label>
              <Input
                id="lowStockThreshold"
                type="number"
                min="1"
                max="100"
                step="1"
                value={lowStockThreshold}
                onChange={e => setLowStockThreshold(e.target.value)}
              />
              {!thresholdValid ? (
                <p className="text-xs text-red-600">Enter an integer between 1 and 100.</p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Used by Low-stock only mode to show the “Only X left” message.
                </p>
              )}
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button
                type="submit"
                variant="solid"
                disabled={!isDirty || !thresholdValid || updateSettings.isPending}
              >
                {updateSettings.isPending ? 'Saving...' : 'Save Stock Display'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default StockDisplayCard;
