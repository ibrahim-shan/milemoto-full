'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';

/**
 * A simple full-page loader.
 */
function FullPageLoader() {
  return (
    <div className="bg-background grid min-h-dvh place-items-center">
      <div className="border-muted-foreground/20 border-t-primary h-12 w-12 animate-spin rounded-full border-4" />
    </div>
  );
}

/**
 * This layout component acts as a "guard" for public-only routes.
 * It checks the user's authentication status and redirects them
 * to their account page if they are already logged in.
 */
export default function PublicOnlyLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for the auth state to be loaded
    if (loading) {
      return;
    }

    // If the user is authenticated, redirect them away
    if (isAuthenticated) {
      const u = user as { role?: string };
      const r = String(u?.role || '').toLowerCase();

      if (r === 'admin' || r.includes('admin')) {
        router.replace('/admin');
      } else {
        router.replace('/account');
      }
    }
  }, [isAuthenticated, loading, router, user]);

  // 1. If auth is loading, show a full-page loader.
  // 2. If user is authenticated, we're about to redirect,
  //    so we also show the loader to prevent the page from flashing.
  if (loading || isAuthenticated) {
    return <FullPageLoader />;
  }

  // 3. If auth is loaded and user is not authenticated, show the page.
  return <>{children}</>;
}
