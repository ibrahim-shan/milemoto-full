'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { toast } from 'sonner';

import { CartItem, type AddCartItemInput } from '@/features/cart/types';
import { getAccessToken, subscribe as subscribeAuth } from '@/lib/authStorage';
import {
  clearServerCart,
  fetchServerCart,
  mergeGuestCart,
  removeServerCartItem,
  setServerCartItemQty,
} from '@/lib/cart';
import type { ServerCartResponse } from '@/lib/cart';

type CartContextValue = {
  items: CartItem[];
  addItem: (input: AddCartItemInput) => void;
  removeItem: (id: string) => void;
  setItemQty: (id: string, qty: number) => void;
  clear: () => void;
  /** Merge the current guest cart into the server, then clear local cart. */
  mergeIntoServer: () => Promise<void>;
  /** After login: fetch server cart and hydrate local state. */
  loadFromServer: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = 'mm_cart_items';

function writeGuestCartToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function clearGuestCartStorage() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

function normalizeQty(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 1;
  const n = Math.floor(value);
  return Math.max(1, Math.min(999, n));
}

function clampQtyToStock(qty: number, stock?: number): number {
  const normalized = normalizeQty(qty);
  if (stock === undefined || !Number.isFinite(stock)) return normalized;
  const stockInt = Math.max(0, Math.floor(stock));
  if (stockInt <= 0) return 1;
  return Math.min(normalized, stockInt);
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const STALE_PRICE_MS = 24 * 60 * 60 * 1000; // 24 h

function loadInitialItems(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return (
      parsed
        .filter((it): it is CartItem => {
          return (
            typeof it === 'object' &&
            it !== null &&
            typeof it.id === 'string' &&
            typeof it.slug === 'string' &&
            typeof it.title === 'string' &&
            typeof it.imageSrc === 'string' &&
            typeof it.priceMinor === 'number' &&
            typeof it.qty === 'number' &&
            Number.isFinite(it.qty)
          );
        })
        // Drop items older than 7 days
        .filter(it => !it.addedAt || now - it.addedAt < SEVEN_DAYS_MS)
        // Inject stale price warning for items not refreshed in 24h
        .map(it => {
          const isStale = it.addedAt && now - it.addedAt > STALE_PRICE_MS;
          return isStale && !it.warning
            ? { ...it, warning: 'Price may have changed — will confirm at checkout' }
            : it;
        })
    );
  } catch {
    return [];
  }
}

function mapServerCartToLocalItems(response: ServerCartResponse): CartItem[] {
  return response.items.map(it => ({
    id: `${it.productSlug}::${it.productVariantId}`,
    slug: it.productSlug,
    title: it.productName,
    ...(it.variantName ? { variantName: it.variantName } : {}),
    imageSrc: it.imageSrc ?? '/images/placeholder.png',
    priceMinor: Math.round(it.price * 100),
    qty: it.quantity,
    stock: it.available,
    ...(it.warning ? { warning: it.warning } : {}),
    productVariantId: it.productVariantId,
  }));
}

function notifyCartHydrationChanges(previousItems: CartItem[], nextItems: CartItem[]) {
  const prevByVariant = new Map<number, CartItem>();
  previousItems.forEach(it => {
    if (it.productVariantId != null) prevByVariant.set(it.productVariantId, it);
  });

  if (prevByVariant.size === 0) return;

  const nextVariantIds = new Set<number>();
  nextItems.forEach(it => {
    if (it.productVariantId != null) nextVariantIds.add(it.productVariantId);
  });

  const skippedCount = [...prevByVariant.keys()].filter(id => !nextVariantIds.has(id)).length;
  if (skippedCount > 0) {
    toast.info(
      skippedCount === 1
        ? 'Some items were unavailable and were skipped.'
        : `${skippedCount} items were unavailable and were skipped.`,
    );
  }

  const hasPriceChange = nextItems.some(it => {
    if (it.productVariantId == null) return false;
    const prev = prevByVariant.get(it.productVariantId);
    return Boolean(prev && prev.priceMinor !== it.priceMinor);
  });
  if (hasPriceChange) {
    toast.info('Price updated at checkout/cart refresh.');
  }
}

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>(() => loadInitialItems());
  const [serverMode, setServerMode] = useState<boolean>(() => Boolean(getAccessToken()));
  const pendingMergeSnapshotRef = useRef<CartItem[] | null>(null);

  const isAuthed = useCallback(() => Boolean(getAccessToken()), []);

  useEffect(() => {
    if (serverMode) return;
    writeGuestCartToStorage(items);
  }, [items, serverMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => {
      if (Boolean(getAccessToken())) return;
      setItems(loadInitialItems());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    let previousAuthed = Boolean(getAccessToken());

    const unsubscribe = subscribeAuth(() => {
      const authed = Boolean(getAccessToken());
      setServerMode(authed);

      if (authed && !previousAuthed) {
        void fetchServerCart().then(response => {
          if (!response) return;
          setItems(prev => {
            const next = mapServerCartToLocalItems(response);
            const baseline = pendingMergeSnapshotRef.current ?? prev;
            notifyCartHydrationChanges(baseline, next);
            pendingMergeSnapshotRef.current = null;
            return next;
          });
        });
      }

      if (!authed && previousAuthed) {
        setItems(loadInitialItems());
      }

      previousAuthed = authed;
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const addItem = useCallback((input: AddCartItemInput) => {
    const qty = clampQtyToStock(input.qty ?? 1, input.stock);
    const id = input.productVariantId ? `${input.slug}::${input.productVariantId}` : input.slug;
    setItems(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing) {
        const nextStock = input.stock ?? existing.stock;
        const nextQty = clampQtyToStock(existing.qty + qty, nextStock);
        return prev.map(item =>
          item.id === id
            ? (() => {
                const { warning, variantName, ...rest } = item;
                void warning;
                void variantName;
                return {
                  ...rest,
                  title: input.title,
                  ...(input.variantName !== undefined ? { variantName: input.variantName } : {}),
                  qty: nextQty,
                  imageSrc: input.imageSrc,
                  priceMinor: input.priceMinor,
                  ...(input.stock !== undefined ? { stock: input.stock } : {}),
                  addedAt: Date.now(),
                };
              })()
            : item,
        );
      }
      const next: CartItem = {
        id,
        slug: input.slug,
        title: input.title,
        ...(input.variantName !== undefined ? { variantName: input.variantName } : {}),
        imageSrc: input.imageSrc,
        priceMinor: input.priceMinor,
        qty: clampQtyToStock(qty, input.stock),
        ...(input.stock !== undefined ? { stock: input.stock } : {}),
        productVariantId: input.productVariantId,
        addedAt: Date.now(), // stamp when item was added for stale-price detection
      };
      return [...prev, next];
    });
  }, []);

  const removeItem = useCallback(
    (id: string) => {
      setItems(prev => prev.filter(item => item.id !== id));
      if (!isAuthed()) return;
      void (async () => {
        try {
          const variantId = items.find(it => it.id === id)?.productVariantId;
          if (!variantId) return;
          const serverCart = await fetchServerCart();
          const serverItem = serverCart?.items.find(it => it.productVariantId === variantId);
          if (!serverItem) return;
          const updated = await removeServerCartItem(serverItem.id);
          if (updated) setItems(mapServerCartToLocalItems(updated));
        } catch (err) {
          console.warn('[cart] Failed to sync removeItem to server:', err);
        }
      })();
    },
    [isAuthed, items],
  );

  const setItemQty = useCallback(
    (id: string, qty: number) => {
      setItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, qty: clampQtyToStock(qty, item.stock) } : item,
        ),
      );
      if (!isAuthed()) return;
      void (async () => {
        try {
          const localItem = items.find(it => it.id === id);
          const variantId = localItem?.productVariantId;
          if (!variantId) return;
          const nextQty = clampQtyToStock(qty, localItem?.stock);
          const serverCart = await fetchServerCart();
          const serverItem = serverCart?.items.find(it => it.productVariantId === variantId);
          if (!serverItem) return;
          const updated = await setServerCartItemQty(serverItem.id, nextQty);
          if (updated) setItems(mapServerCartToLocalItems(updated));
        } catch (err) {
          console.warn('[cart] Failed to sync setItemQty to server:', err);
        }
      })();
    },
    [isAuthed, items],
  );

  const clear = useCallback(() => {
    setItems([]);
    if (!isAuthed()) return;
    void clearServerCart()
      .then(updated => {
        if (updated) setItems(mapServerCartToLocalItems(updated));
      })
      .catch(err => {
        console.warn('[cart] Failed to sync clear cart to server:', err);
      });
  }, [isAuthed]);

  const mergeIntoServer = useCallback(async () => {
    // Only send items that have a known productVariantId (server requires it)
    const serverItems = items
      .filter(it => it.productVariantId != null)
      .map(it => ({ productVariantId: it.productVariantId!, quantity: it.qty }));

    const success = await mergeGuestCart(serverItems);
    if (success) pendingMergeSnapshotRef.current = items;

    if (success) {
      // Merge succeeded → server is now source of truth, clear local cache
      setItems([]);
      clearGuestCartStorage();
    } else {
      // Merge failed (network down etc.) → keep items in place so user doesn't lose their cart.
      // loadFromServer() will be called next and will overwrite with server data if reachable.
      console.warn('[cart] Merge failed — local cart preserved. Will retry on next login.');
    }
  }, [items]);

  /**
   * After login: fetch the server cart and hydrate local items with live data.
   * Maps server CartItemResponse → local CartItem format.
   */
  const loadFromServer = useCallback(async () => {
    const response = await fetchServerCart();
    if (!response) return;

    setItems(prev => {
      const next = mapServerCartToLocalItems(response);
      const baseline = pendingMergeSnapshotRef.current ?? prev;
      notifyCartHydrationChanges(baseline, next);
      pendingMergeSnapshotRef.current = null;
      return next;
    });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      removeItem,
      setItemQty,
      clear,
      mergeIntoServer,
      loadFromServer,
    }),
    [items, addItem, removeItem, setItemQty, clear, mergeIntoServer, loadFromServer],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
