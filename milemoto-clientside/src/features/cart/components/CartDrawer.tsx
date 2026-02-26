// src/features/cart/CartDrawer.tsx
'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

import { CartItem } from '@/features/cart/types';
import { IMAGE_PLACEHOLDERS } from '@/lib/image-placeholders';
import { Button } from '@/ui/button';
import { FallbackImage } from '@/ui/fallback-image';

type Props = {
  open: boolean;
  items: CartItem[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
};

function formatPrice(minor: number, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100);
}

function lockBodyScroll() {
  const y = window.scrollY;

  const html = document.documentElement;
  const prev = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: document.body.style.overflow,
    bodyPos: document.body.style.position,
    bodyTop: document.body.style.top,
    bodyW: document.body.style.width,
  };

  html.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${y}px`;
  document.body.style.width = '100%';

  return () => {
    html.style.overflow = prev.htmlOverflow;
    document.body.style.overflow = prev.bodyOverflow;
    document.body.style.position = prev.bodyPos;
    document.body.style.top = prev.bodyTop;
    document.body.style.width = prev.bodyW;
    window.scrollTo(0, y);
  };
}

export function CartDrawer({ open, items, onClose, onRemove, onCheckout }: Props) {
  const [mounted, setMounted] = useState(false);
  const labelId = useId();

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // body scroll lock
  useEffect(() => {
    if (!open) return;
    const unlock = lockBodyScroll();
    return unlock;
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const subtotal = items.reduce((s, it) => s + it.priceMinor * it.qty, 0);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="cart-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="z-9998 fixed inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            key="cart-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
            id="cart-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="bg-card text-foreground z-9999 fixed left-0 right-0 flex w-screen flex-col shadow-xl outline-none md:left-auto md:w-full md:max-w-sm"
            style={{
              top: 'var(--mobile-chrome-top, 0px)',
              bottom: 'var(--mobile-chrome-bottom, 0px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-border/60 flex shrink-0 items-center justify-between border-b px-4 py-3">
              <h2
                id={labelId}
                className="text-sm font-semibold"
              >
                Shopping cart
              </h2>
              <Button
                variant="ghost"
                size="sm"
                icon
                aria-label="Close cart"
                onClick={onClose}
                className="h-8 w-8 rounded-md"
              >
                <X
                  className="h-4 w-4"
                  aria-hidden
                />
              </Button>
            </div>

            {/* Items (scrollable) */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
              {items.length === 0 ? (
                <p className="text-foreground/70 text-sm">Your cart is empty.</p>
              ) : (
                <ul className="space-y-3">
                  {items.map(it => (
                    <li
                      key={it.id}
                      className="flex items-center gap-3"
                    >
                      <FallbackImage
                        src={it.imageSrc}
                        fallbackSrc={IMAGE_PLACEHOLDERS.product4x3}
                        alt={it.title}
                        width={56}
                        height={56}
                        className="border-border/60 rounded border object-cover"
                      />
                      <div className="min-w-0 grow">
                        <p className="truncate text-sm font-medium">{it.title}</p>
                        {it.variantName && (
                          <p className="text-foreground/50 truncate text-xs">{it.variantName}</p>
                        )}
                        {it.warning && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-amber-500">
                            <AlertTriangle
                              className="h-3 w-3 shrink-0"
                              aria-hidden
                            />
                            {it.warning}
                          </p>
                        )}
                        <p className="text-foreground/70 text-xs">
                          {formatPrice(it.priceMinor)} × {it.qty}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onRemove(it.id)}
                        aria-label={`Remove ${it.title}`}
                        className="text-foreground/70 hover:text-foreground"
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="border-border/60 shrink-0 border-t p-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-foreground/70">Subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>

              <Button
                variant="solid"
                justify="center"
                size="md"
                fullWidth
                onClick={onCheckout}
                disabled={items.length === 0}
              >
                Checkout
              </Button>

              <Button
                href="/cart"
                variant="outline"
                justify="center"
                size="md"
                fullWidth
                className="mt-3"
                onClick={onClose}
              >
                Go to Cart
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default CartDrawer;
