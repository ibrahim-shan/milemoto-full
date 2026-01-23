'use client';

import { useEffect, useMemo, useState } from 'react';

import { FormField } from './shared';

import { Skeleton } from '@/features/feedback/Skeleton';
import { useGetDocumentSettings, useUpdateDocumentSettings } from '@/hooks/useSiteSettingsQueries';
import { Button } from '@/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { Textarea } from '@/ui/textarea';

export function DocumentSettingsCard() {
  const { data: documentData, isLoading } = useGetDocumentSettings();
  const updateSettings = useUpdateDocumentSettings();

  // Documents Form State
  const initialTerms = useMemo(() => documentData?.purchaseOrderTerms || '', [documentData]);

  const [terms, setTerms] = useState(initialTerms);

  // Sync state when data loads
  useEffect(() => {
    setTerms(initialTerms);
  }, [initialTerms]);

  // Check if settings have changed
  const isDirty = terms !== initialTerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDirty) {
      await updateSettings.mutateAsync({
        purchaseOrderTerms: terms,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>Construct defaults for your printed documents (PDFs).</CardDescription>
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
              id="poTerms"
              label="Purchase Order Terms & Conditions"
              description="This text will appear at the bottom of every Purchase Order PDF."
            >
              <Textarea
                id="poTerms"
                value={terms}
                onChange={e => setTerms(e.target.value)}
                rows={6}
                placeholder="e.g. Payment due within 30 days..."
                className="font-mono text-sm"
              />
            </FormField>

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
