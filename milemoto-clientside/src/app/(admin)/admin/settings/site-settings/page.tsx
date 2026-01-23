'use client';

import { BrandingCard } from '@/features/admin/settings/site-settings/branding-card';
import { DocumentSettingsCard } from '@/features/admin/settings/site-settings/document-settings-card';
import { FeatureTogglesCard } from '@/features/admin/settings/site-settings/feature-toggles-card';
import { LocalizationCard } from '@/features/admin/settings/site-settings/localization-card';
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

      {/* --- Card 3: Documents --- */}
      <DocumentSettingsCard />

      {/* --- Card 4: Features & Toggles --- */}
      <FeatureTogglesCard />
    </div>
  );
}
