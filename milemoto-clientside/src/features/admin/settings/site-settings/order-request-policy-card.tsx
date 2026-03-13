'use client';

import { useEffect, useMemo, useState } from 'react';

import { Skeleton } from '@/features/feedback/Skeleton';
import {
  useGetOrderRequestPolicySettings,
  useUpdateOrderRequestPolicySettings,
} from '@/hooks/useSiteSettingsQueries';
import { Button } from '@/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { Input } from '@/ui/input';

export function OrderRequestPolicyCard() {
  const { data: settings, isLoading } = useGetOrderRequestPolicySettings();
  const updateSettings = useUpdateOrderRequestPolicySettings();

  const initialSettings = useMemo(
    () => ({
      returnWindowDays: settings?.returnWindowDays ?? 30,
      refundWindowDays: settings?.refundWindowDays ?? 30,
      returnRestockLocationId: settings?.returnRestockLocationId ?? 0,
    }),
    [settings],
  );

  const [returnWindowDays, setReturnWindowDays] = useState(
    String(initialSettings.returnWindowDays),
  );
  const [refundWindowDays, setRefundWindowDays] = useState(
    String(initialSettings.refundWindowDays),
  );
  const [returnRestockLocationId, setReturnRestockLocationId] = useState(
    String(initialSettings.returnRestockLocationId),
  );

  useEffect(() => {
    setReturnWindowDays(String(initialSettings.returnWindowDays));
    setRefundWindowDays(String(initialSettings.refundWindowDays));
    setReturnRestockLocationId(String(initialSettings.returnRestockLocationId));
  }, [initialSettings]);

  const parsedReturnWindow = Number.parseInt(returnWindowDays, 10);
  const parsedRefundWindow = Number.parseInt(refundWindowDays, 10);
  const parsedRestockLocationId = Number.parseInt(returnRestockLocationId, 10);

  const returnWindowValid =
    Number.isInteger(parsedReturnWindow) && parsedReturnWindow >= 0 && parsedReturnWindow <= 365;
  const refundWindowValid =
    Number.isInteger(parsedRefundWindow) && parsedRefundWindow >= 0 && parsedRefundWindow <= 365;
  const restockLocationValid =
    Number.isInteger(parsedRestockLocationId) && parsedRestockLocationId >= 0;

  const isDirty =
    !!settings &&
    (String(initialSettings.returnWindowDays) !== returnWindowDays ||
      String(initialSettings.refundWindowDays) !== refundWindowDays ||
      String(initialSettings.returnRestockLocationId) !== returnRestockLocationId);

  const canSave = isDirty && returnWindowValid && refundWindowValid && restockLocationValid;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    await updateSettings.mutateAsync({
      returnWindowDays: parsedReturnWindow,
      refundWindowDays: parsedRefundWindow,
      returnRestockLocationId: parsedRestockLocationId,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Request Policy</CardTitle>
        <CardDescription>
          Configure return/refund windows and default restock location for completed returns.
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="orderReturnWindowDays"
                  className="text-sm font-medium"
                >
                  Return Window (days)
                </label>
                <Input
                  id="orderReturnWindowDays"
                  type="number"
                  min="0"
                  max="365"
                  step="1"
                  value={returnWindowDays}
                  onChange={event => setReturnWindowDays(event.target.value)}
                />
                {!returnWindowValid ? (
                  <p className="text-xs text-red-600">Enter an integer from 0 to 365.</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="orderRefundWindowDays"
                  className="text-sm font-medium"
                >
                  Refund Window (days)
                </label>
                <Input
                  id="orderRefundWindowDays"
                  type="number"
                  min="0"
                  max="365"
                  step="1"
                  value={refundWindowDays}
                  onChange={event => setRefundWindowDays(event.target.value)}
                />
                {!refundWindowValid ? (
                  <p className="text-xs text-red-600">Enter an integer from 0 to 365.</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="orderReturnRestockLocationId"
                className="text-sm font-medium"
              >
                Default Return Restock Location ID
              </label>
              <Input
                id="orderReturnRestockLocationId"
                type="number"
                min="0"
                step="1"
                value={returnRestockLocationId}
                onChange={event => setReturnRestockLocationId(event.target.value)}
              />
              {!restockLocationValid ? (
                <p className="text-xs text-red-600">Enter an integer greater than or equal to 0.</p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Use <span className="font-semibold">0</span> to auto-pick the first active stock
                  location.
                </p>
              )}
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button
                type="submit"
                variant="solid"
                disabled={!canSave || updateSettings.isPending}
              >
                {updateSettings.isPending ? 'Saving...' : 'Save Order Request Policy'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default OrderRequestPolicyCard;
