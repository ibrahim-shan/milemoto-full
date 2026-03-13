'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  useGetInvoicePolicySettings,
  useUpdateInvoicePolicySettings,
} from '@/hooks/useSiteSettingsQueries';
import { Button } from '@/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { GeneralCombobox } from '@/ui/combobox';
import { Label } from '@/ui/label';
import { Switch } from '@/ui/switch';

export function InvoicePolicyCard() {
  const { data: settings, isLoading } = useGetInvoicePolicySettings();
  const updateSettings = useUpdateInvoicePolicySettings();

  const initialSettings = useMemo(
    () => ({
      autoGenerateEnabled: settings?.autoGenerateEnabled ?? true,
      autoGenerateTrigger: settings?.autoGenerateTrigger ?? ('delivered' as const),
    }),
    [settings],
  );

  const [autoGenerateEnabled, setAutoGenerateEnabled] = useState(initialSettings.autoGenerateEnabled);
  const [autoGenerateTrigger, setAutoGenerateTrigger] = useState(initialSettings.autoGenerateTrigger);

  useEffect(() => {
    setAutoGenerateEnabled(initialSettings.autoGenerateEnabled);
    setAutoGenerateTrigger(initialSettings.autoGenerateTrigger);
  }, [initialSettings]);

  const isDirty =
    !!settings &&
    (autoGenerateEnabled !== initialSettings.autoGenerateEnabled ||
      autoGenerateTrigger !== initialSettings.autoGenerateTrigger);

  const canSave = isDirty && !updateSettings.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;

    await updateSettings.mutateAsync({
      autoGenerateEnabled,
      autoGenerateTrigger,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Policy</CardTitle>
        <CardDescription>
          Control when invoices are auto-generated. Manual generation is always available.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading invoice policy...</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-generate invoices</Label>
                <p className="text-muted-foreground text-sm">
                  Automatically create invoice once the configured trigger happens.
                </p>
              </div>
              <Switch
                checked={autoGenerateEnabled}
                onCheckedChange={setAutoGenerateEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceAutoGenerateTrigger">Auto-generate trigger</Label>
              <GeneralCombobox
                id="invoiceAutoGenerateTrigger"
                data={[
                  { value: 'delivered', label: 'Order delivered' },
                  { value: 'payment_confirmed', label: 'Payment confirmed' },
                ]}
                value={autoGenerateTrigger}
                onChange={value =>
                  setAutoGenerateTrigger(value as 'delivered' | 'payment_confirmed')
                }
              />
              <p className="text-muted-foreground text-xs">
                Use <span className="font-medium">Order delivered</span> now.{' '}
                <span className="font-medium">Payment confirmed</span> is ready for online payment
                flow.
              </p>
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button
                type="submit"
                variant="solid"
                disabled={!canSave}
              >
                {updateSettings.isPending ? 'Saving...' : 'Save Invoice Policy'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default InvoicePolicyCard;
