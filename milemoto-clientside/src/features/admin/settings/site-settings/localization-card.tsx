'use client';

import { useEffect, useMemo, useState } from 'react';

import { FormField } from './shared'; // Import from shared file

import { Skeleton } from '@/features/feedback/Skeleton';
import { useGetActiveLanguages } from '@/hooks/useLanguageQueries';
import {
  useGetLocalizationSettings,
  useUpdateLocalizationSettings,
} from '@/hooks/useSiteSettingsQueries';
import { Button } from '@/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { GeneralCombobox } from '@/ui/combobox';
import { TimezoneSelector } from '@/ui/timezone-selector';

export function LocalizationCard() {
  // Fetch localization settings
  const { data: localizationData, isLoading: isLoadingSettings } = useGetLocalizationSettings();
  const { data: activeLanguages = [], isLoading: isLoadingLanguages } = useGetActiveLanguages();
  const updateLocalization = useUpdateLocalizationSettings();

  // --- Localization Form State ---
  const initialLocalization = useMemo(
    () => ({
      dateFormat: localizationData?.dateFormat || 'MM/DD/YYYY',
      timeFormat: localizationData?.timeFormat || '12h',
      timezone: localizationData?.defaultTimezone || 'Asia/Beirut',
      languageId: localizationData?.defaultLanguageId || 1,
    }),
    [localizationData],
  );

  const [dateFormat, setDateFormat] = useState(initialLocalization.dateFormat);
  const [timeFormat, setTimeFormat] = useState(initialLocalization.timeFormat);
  const [timezone, setTimezone] = useState(initialLocalization.timezone);
  const [languageId, setLanguageId] = useState(initialLocalization.languageId);

  // Sync state when data loads
  useEffect(() => {
    setDateFormat(initialLocalization.dateFormat);
    setTimeFormat(initialLocalization.timeFormat);
    setTimezone(initialLocalization.timezone);
    setLanguageId(initialLocalization.languageId);
  }, [initialLocalization]);

  // Check if localization settings have changed
  const isLocalizationDirty = localizationData
    ? dateFormat !== initialLocalization.dateFormat ||
      timeFormat !== initialLocalization.timeFormat ||
      timezone !== initialLocalization.timezone ||
      languageId !== initialLocalization.languageId
    : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted', { isLocalizationDirty });

    if (isLocalizationDirty) {
      console.log('Saving localization settings...', {
        dateFormat,
        timeFormat,
        timezone,
        languageId,
      });
      await updateLocalization.mutateAsync({
        dateFormat: dateFormat as 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD',
        timeFormat: timeFormat as '12h' | '24h',
        defaultTimezone: timezone,
        defaultLanguageId: languageId,
      });
    } else {
      console.log('No changes to save');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Localization</CardTitle>
        <CardDescription>Manage time, date, language, and currency settings.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingSettings ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="space-y-2"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                id="dateFormat"
                label="Date Format"
              >
                <GeneralCombobox
                  id="dateFormat"
                  data={[
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                  ]}
                  placeholder="Select format"
                  value={dateFormat}
                  onChange={value => setDateFormat(value as typeof dateFormat)}
                />
              </FormField>

              <FormField
                id="timeFormat"
                label="Time Format"
              >
                <GeneralCombobox
                  id="timeFormat"
                  data={[
                    { value: '12h', label: '12-hour (e.g., 2:30 PM)' },
                    { value: '24h', label: '24-hour (e.g., 14:30)' },
                  ]}
                  placeholder="Select format"
                  value={timeFormat}
                  onChange={value => setTimeFormat(value as typeof timeFormat)}
                />
              </FormField>

              <FormField
                id="timezone"
                label="Default Timezone"
              >
                <TimezoneSelector
                  id="timezone"
                  value={timezone}
                  onChange={tz => setTimezone(tz)}
                />
              </FormField>

              <FormField
                id="language"
                label="Default Language"
              >
                {isLoadingLanguages ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <GeneralCombobox
                    id="language"
                    data={activeLanguages.map(lang => ({
                      value: lang.id,
                      label: lang.name,
                      searchValue: lang.name,
                    }))}
                    placeholder="Select language"
                    value={languageId}
                    onChange={value => setLanguageId(Number(value))}
                  />
                )}
              </FormField>
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button
                type="submit"
                variant="solid"
                disabled={!isLocalizationDirty || updateLocalization.isPending}
                onClick={handleSubmit}
              >
                {updateLocalization.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
