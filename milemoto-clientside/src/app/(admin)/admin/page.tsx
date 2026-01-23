'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Loader2, ShieldAlert } from 'lucide-react';

import { adminNavigation } from '@/config/admin-navigation';
import { useMyPermissions } from '@/hooks/useMyPermissions';

export default function AdminIndexPage() {
  const { data: permissions, isLoading } = useMyPermissions();
  const router = useRouter();

  let firstAllowed: string | null = null;

  if (!isLoading && permissions) {
    // Find first allowed route
    for (const item of adminNavigation) {
      if ('items' in item) {
        // Group
        const allowedSub = item.items.find(sub => permissions.includes(sub.perm));
        if (allowedSub) {
          firstAllowed = allowedSub.href;
          break;
        }
      } else {
        // Single Item
        if (permissions.includes(item.perm)) {
          firstAllowed = item.href;
          break;
        }
      }
    }
  }

  useEffect(() => {
    if (firstAllowed) {
      router.replace(firstAllowed);
    }
  }, [firstAllowed, router]);

  const showDenied = !isLoading && permissions && !firstAllowed;

  if (showDenied) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <div className="bg-destructive/10 mb-4 rounded-full p-4">
          <ShieldAlert className="text-destructive h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Access Denied</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          You don&apos;t have permission to access any admin pages. Please contact your
          administrator.
        </p>
      </div>
    );
  }

  // Show loader while loading or redirecting
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
    </div>
  );
}
