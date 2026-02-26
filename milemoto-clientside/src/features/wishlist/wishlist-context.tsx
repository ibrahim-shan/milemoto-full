'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import * as wishlistApi from '@/lib/wishlist';

export type WishlistItem = {
  href: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
  priceMinor: number;
  addedAt: string;
};

type WishlistContextValue = {
  items: WishlistItem[];
  count: number;
  isFavorite: (href: string) => boolean;
  addItem: (item: Omit<WishlistItem, 'addedAt'>) => void;
  removeItem: (href: string) => void;
  toggleItem: (item: Omit<WishlistItem, 'addedAt'>) => void;
  clear: () => void;
};

const STORAGE_KEY = 'mm_wishlist_v1';

const WishlistContext = createContext<WishlistContextValue | null>(null);

function parseStoredWishlist(raw: string | null): WishlistItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is WishlistItem => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate.href === 'string' &&
        typeof candidate.title === 'string' &&
        typeof candidate.imageSrc === 'string' &&
        typeof candidate.imageAlt === 'string' &&
        typeof candidate.priceMinor === 'number' &&
        typeof candidate.addedAt === 'string'
      );
    });
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const hydratedRef = useRef(false);
  const authSyncedRef = useRef(false);

  useEffect(() => {
    try {
      setItems(parseStoredWishlist(window.localStorage.getItem(STORAGE_KEY)));
    } catch {
      setItems([]);
    } finally {
      hydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage failures
    }
  }, [items]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setItems(parseStoredWishlist(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      if (authSyncedRef.current) {
        setItems([]);
      }
      authSyncedRef.current = false;
      return;
    }

    if (authSyncedRef.current) return;
    authSyncedRef.current = true;

    let cancelled = false;
    const syncServer = async () => {
      try {
        const localSnapshot = [...items];
        if (localSnapshot.length > 0) {
          const slugs = localSnapshot
            .map(item => item.href.match(/^\/product\/(.+)$/)?.[1] ?? null)
            .filter((slug): slug is string => Boolean(slug));
          if (slugs.length > 0) {
            await wishlistApi.mergeWishlist([...new Set(slugs)]);
          }
        }

        const server = await wishlistApi.getWishlist();
        if (cancelled) return;
        setItems(
          server.items.map(item => ({
            href: `/product/${item.productSlug}`,
            title: item.productName,
            imageSrc: item.imageSrc ?? '',
            imageAlt: item.productName,
            priceMinor: Math.round(Number(item.price) * 100),
            addedAt: item.addedAt,
          })),
        );
      } catch {
        // keep local items if server sync fails
      }
    };

    void syncServer();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, items]);

  const value = useMemo<WishlistContextValue>(() => {
    const isFavorite = (href: string) => items.some(item => item.href === href);

    const addItem = (item: Omit<WishlistItem, 'addedAt'>) => {
      if (isAuthenticated) {
        const slug = item.href.match(/^\/product\/(.+)$/)?.[1];
        if (!slug) return;
        void wishlistApi
          .addWishlistItem(slug)
          .then(server => {
            setItems(
              server.items.map(entry => ({
                href: `/product/${entry.productSlug}`,
                title: entry.productName,
                imageSrc: entry.imageSrc ?? '',
                imageAlt: entry.productName,
                priceMinor: Math.round(Number(entry.price) * 100),
                addedAt: entry.addedAt,
              })),
            );
            toast.success('Added to favorites');
          })
          .catch(err => toast.error(err instanceof Error ? err.message : 'Failed to add favorite'));
        return;
      }

      let added = false;
      setItems(prev => {
        if (prev.some(existing => existing.href === item.href)) return prev;
        const next: WishlistItem = { ...item, addedAt: new Date().toISOString() };
        added = true;
        return [next, ...prev];
      });
      if (added) toast.success('Added to favorites');
    };

    const removeItem = (href: string) => {
      if (isAuthenticated) {
        const slug = href.match(/^\/product\/(.+)$/)?.[1];
        if (!slug) return;
        void wishlistApi
          .removeWishlistItemBySlug(slug)
          .then(server => {
            setItems(
              server.items.map(entry => ({
                href: `/product/${entry.productSlug}`,
                title: entry.productName,
                imageSrc: entry.imageSrc ?? '',
                imageAlt: entry.productName,
                priceMinor: Math.round(Number(entry.price) * 100),
                addedAt: entry.addedAt,
              })),
            );
            toast.success('Removed from favorites');
          })
          .catch(err =>
            toast.error(err instanceof Error ? err.message : 'Failed to remove favorite')
          );
        return;
      }

      let removed = false;
      setItems(prev => {
        const next = prev.filter(item => item.href !== href);
        removed = next.length !== prev.length;
        return next;
      });
      if (removed) toast.success('Removed from favorites');
    };

    const toggleItem = (item: Omit<WishlistItem, 'addedAt'>) => {
      if (isFavorite(item.href)) {
        removeItem(item.href);
        return;
      }
      addItem(item);
    };

    const clear = () => {
      if (isAuthenticated) {
        void wishlistApi
          .clearWishlist()
          .then(server => {
            setItems(
              server.items.map(entry => ({
                href: `/product/${entry.productSlug}`,
                title: entry.productName,
                imageSrc: entry.imageSrc ?? '',
                imageAlt: entry.productName,
                priceMinor: Math.round(Number(entry.price) * 100),
                addedAt: entry.addedAt,
              })),
            );
          })
          .catch(err => toast.error(err instanceof Error ? err.message : 'Failed to clear favorites'));
        return;
      }
      setItems([]);
    };

    return {
      items,
      count: items.length,
      isFavorite,
      addItem,
      removeItem,
      toggleItem,
      clear,
    };
  }, [isAuthenticated, items]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
}
