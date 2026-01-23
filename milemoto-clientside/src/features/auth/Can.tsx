'use client';

import { useMyPermissions } from '@/hooks/useMyPermissions';

type CanProps = {
  perform: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function Can({ perform, children, fallback = null }: CanProps) {
  const { data: permissions, isLoading } = useMyPermissions();

  // If loading, we arguably shouldn't show the content yet, or we show nothing.
  // For admin panel items, showing nothing is safer than flashing forbidden content.
  if (isLoading) return null;

  if (permissions?.includes(perform)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
