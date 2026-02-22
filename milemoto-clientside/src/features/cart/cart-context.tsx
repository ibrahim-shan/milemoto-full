'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { CartItem, type AddCartItemInput } from '@/features/cart/types';
import { fetchServerCart, mergeGuestCart } from '@/lib/cart';

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

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>(() => loadInitialItems());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => {
      setItems(loadInitialItems());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
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

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const setItemQty = useCallback((id: string, qty: number) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, qty: clampQtyToStock(qty, item.stock) } : item,
      ),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const mergeIntoServer = useCallback(async () => {
    // Only send items that have a known productVariantId (server requires it)
    const serverItems = items
      .filter(it => it.productVariantId != null)
      .map(it => ({ productVariantId: it.productVariantId!, quantity: it.qty }));

    const success = await mergeGuestCart(serverItems);

    if (success) {
      // Merge succeeded → server is now source of truth, clear local cache
      setItems([]);
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

    const mapped: CartItem[] = response.items.map(it => ({
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

    setItems(mapped);
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
