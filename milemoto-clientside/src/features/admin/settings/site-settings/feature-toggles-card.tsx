'use client';

import { useEffect, useMemo, useState } from 'react';

import { SwitchRow } from './shared'; // Import from shared file

import { Skeleton } from '@/features/feedback/Skeleton';
import {
  useGetFeatureTogglesSettings,
  useUpdateFeatureTogglesSettings,
} from '@/hooks/useSiteSettingsQueries';
import { Button } from '@/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';

export function FeatureTogglesCard() {
  const { data: settings, isLoading } = useGetFeatureTogglesSettings();
  const updateSettings = useUpdateFeatureTogglesSettings();

  const initialSettings = useMemo(
    () => ({
      cashOnDeliveryEnabled: settings?.cashOnDeliveryEnabled ?? true,
      onlinePaymentEnabled: settings?.onlinePaymentEnabled ?? true,
      languageSwitcherEnabled: settings?.languageSwitcherEnabled ?? false,
      phoneVerificationEnabled: settings?.phoneVerificationEnabled ?? true,
      emailVerificationEnabled: settings?.emailVerificationEnabled ?? true,
    }),
    [settings],
  );

  const [cashOnDeliveryEnabled, setCashOnDeliveryEnabled] = useState(
    initialSettings.cashOnDeliveryEnabled,
  );
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(
    initialSettings.onlinePaymentEnabled,
  );
  const [languageSwitcherEnabled, setLanguageSwitcherEnabled] = useState(
    initialSettings.languageSwitcherEnabled,
  );
  const [phoneVerificationEnabled, setPhoneVerificationEnabled] = useState(
    initialSettings.phoneVerificationEnabled,
  );
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState(
    initialSettings.emailVerificationEnabled,
  );

  useEffect(() => {
    setCashOnDeliveryEnabled(initialSettings.cashOnDeliveryEnabled);
    setOnlinePaymentEnabled(initialSettings.onlinePaymentEnabled);
    setLanguageSwitcherEnabled(initialSettings.languageSwitcherEnabled);
    setPhoneVerificationEnabled(initialSettings.phoneVerificationEnabled);
    setEmailVerificationEnabled(initialSettings.emailVerificationEnabled);
  }, [initialSettings]);

  const isDirty = settings
    ? cashOnDeliveryEnabled !== initialSettings.cashOnDeliveryEnabled ||
      onlinePaymentEnabled !== initialSettings.onlinePaymentEnabled ||
      languageSwitcherEnabled !== initialSettings.languageSwitcherEnabled ||
      phoneVerificationEnabled !== initialSettings.phoneVerificationEnabled ||
      emailVerificationEnabled !== initialSettings.emailVerificationEnabled
    : false;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isDirty) return;

    await updateSettings.mutateAsync({
      cashOnDeliveryEnabled,
      onlinePaymentEnabled,
      languageSwitcherEnabled,
      phoneVerificationEnabled,
      emailVerificationEnabled,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Toggles</CardTitle>
        <CardDescription>Enable or disable major features across your store.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-10 w-full"
              />
            ))}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <SwitchRow
              id="cod"
              label="Cash On Delivery"
              checked={cashOnDeliveryEnabled}
              onCheckedChange={setCashOnDeliveryEnabled}
            />
            <SwitchRow
              id="onlinePayment"
              label="Online Payment Gateway"
              checked={onlinePaymentEnabled}
              onCheckedChange={setOnlinePaymentEnabled}
            />
            <SwitchRow
              id="langSwitch"
              label="Language Switcher"
              checked={languageSwitcherEnabled}
              onCheckedChange={setLanguageSwitcherEnabled}
            />
            <SwitchRow
              id="phoneVerification"
              label="Phone Verification"
              checked={phoneVerificationEnabled}
              onCheckedChange={setPhoneVerificationEnabled}
            />
            <SwitchRow
              id="emailVerification"
              label="Email Verification"
              description="Require users to verify their email on signup."
              checked={emailVerificationEnabled}
              onCheckedChange={setEmailVerificationEnabled}
            />

            <div className="flex justify-end border-t pt-4">
              <Button
                type="submit"
                variant="solid"
                disabled={!isDirty || updateSettings.isPending}
              >
                {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
