'use client';

import { useEffect, useMemo, useState } from 'react';

import { FormField } from './shared';

import { Skeleton } from '@/features/feedback/Skeleton';
import { useGetBrandingSettings, useUpdateBrandingSettings } from '@/hooks/useSiteSettingsQueries';
import { Button } from '@/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import SortableImageUpload from '@/ui/sortable-upload';

export function BrandingCard() {
  const { data: brandingData, isLoading } = useGetBrandingSettings();
  const updateBranding = useUpdateBrandingSettings();

  // Branding Form State
  const initialLogoUrl = useMemo(
    () => (brandingData?.logoUrl ? [brandingData.logoUrl] : []),
    [brandingData],
  );

  const [logoUrls, setLogoUrls] = useState<string[]>(initialLogoUrl);

  // Sync state when data loads
  useEffect(() => {
    setLogoUrls(initialLogoUrl);
  }, [initialLogoUrl]);

  // Check if settings have changed
  const isDirty = useMemo(() => {
    const current = logoUrls[0] || null;
    const initial = initialLogoUrl[0] || null;
    return current !== initial;
  }, [logoUrls, initialLogoUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDirty) {
      await updateBranding.mutateAsync({
        logoUrl: logoUrls[0] || null,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Upload your site logo. This will be displayed in the header and emails.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <FormField
              id="logo"
              label="Site Logo"
              className="flex w-full flex-col justify-center"
            >
              <SortableImageUpload
                maxFiles={1}
                maxSize={2 * 1024 * 1024} // 2MB
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                value={logoUrls}
                onChange={setLogoUrls}
                className="w-full"
              />
            </FormField>

            <div className="flex justify-end border-t pt-4">
              <Button
                type="submit"
                variant="solid"
                disabled={!isDirty || updateBranding.isPending}
              >
                {updateBranding.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
