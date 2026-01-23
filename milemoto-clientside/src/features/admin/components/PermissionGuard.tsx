'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Loader2 } from 'lucide-react';

import { useMyPermissions } from '@/hooks/useMyPermissions';

interface PermissionGuardProps {
  requiredPermission: string;
  children: ReactNode;
  fallbackUrl?: string;
}

export function PermissionGuard({
  requiredPermission,
  children,
  fallbackUrl = '/admin',
}: PermissionGuardProps) {
  const { data: permissions, isLoading } = useMyPermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && permissions) {
      if (!permissions.includes(requiredPermission)) {
        router.replace(fallbackUrl);
      }
    }
  }, [isLoading, permissions, requiredPermission, router, fallbackUrl]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If we have permissions but don't have the required one, return null
  // (The useEffect will handle the redirect, this just prevents flash of content)
  if (permissions && !permissions.includes(requiredPermission)) {
    return null;
  }

  // If permissions failed to load (e.g. auth error), the useQuery might handle it or return error.
  // Assuming permissions is present if successful.
  if (!permissions) {
    return null;
  }

  return <>{children}</>;
}
