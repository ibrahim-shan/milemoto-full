'use client';

import { BrandingCard } from '@/features/admin/settings/site-settings/branding-card';
import { DocumentSettingsCard } from '@/features/admin/settings/site-settings/document-settings-card';
import { FeatureTogglesCard } from '@/features/admin/settings/site-settings/feature-toggles-card';
import { InvoicePolicyCard } from '@/features/admin/settings/site-settings/invoice-policy-card';
import { LocalizationCard } from '@/features/admin/settings/site-settings/localization-card';
import { OrderRequestPolicyCard } from '@/features/admin/settings/site-settings/order-request-policy-card';
import { StoreCurrencyCard } from '@/features/admin/settings/site-settings/store-currency-card';

export default function SiteSettingsPage() {
  return (
    <div className="space-y-6">
      {/* --- Card 0: Branding --- */}
      <BrandingCard />

      {/* --- Card 1: Localization --- */}
      <LocalizationCard />

      {/* --- Card 2: Store & Currency --- */}
      <StoreCurrencyCard />

      {/* --- Card 3: Invoice Policy --- */}
      <InvoicePolicyCard />

      {/* --- Card 4: Order Request Policy --- */}
      <OrderRequestPolicyCard />

      {/* --- Card 5: Documents --- */}
      <DocumentSettingsCard />

      {/* --- Card 6: Features & Toggles --- */}
      <FeatureTogglesCard />
    </div>
  );
}
