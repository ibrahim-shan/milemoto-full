// src/app/cart/page.tsx
'use client';

import { useMemo } from 'react';
import Link from 'next/link';

import { AlertTriangle, ArrowLeft, ShoppingCart, X } from 'lucide-react';

import { useCart } from '@/features/cart/cart-context';
import { Breadcrumbs } from '@/features/navigation/Breadcrumbs';
import { useAuth } from '@/hooks/useAuth';
import { formatUSD } from '@/lib/formatPrice';
import { IMAGE_PLACEHOLDERS } from '@/lib/image-placeholders';
import { Button } from '@/ui/button';
import { FallbackImage } from '@/ui/fallback-image';
import { Quantity } from '@/ui/Quantity';

const fmt = (n: number) => formatUSD(n, { locale: 'en-US' });

export default function CartPage() {
  const { items, removeItem, setItemQty } = useCart();
  const { loading: authLoading, isAuthenticated } = useAuth();

  const subMinor = useMemo(() => items.reduce((s, it) => s + it.priceMinor * it.qty, 0), [items]);

  return (
    <main className="bg-background text-foreground mx-auto min-h-dvh max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section>
        <Breadcrumbs
          items={[{ label: 'Home', href: '/' }, { label: 'My Cart' }]}
          showBack
          className="pb-10"
        />

        <h1 className="mb-6 text-2xl font-bold tracking-tight">
          Your Cart{' '}
          <span className="bg-muted ml-1 rounded-full px-2 py-0.5 text-sm">{items.length}</span>
        </h1>

        {items.length === 0 ? (
          /* ── Empty state ── */
          <div className="border-border/60 bg-card flex flex-col items-center gap-4 rounded-xl border py-20 text-center">
            <ShoppingCart
              className="text-muted-foreground h-12 w-12"
              aria-hidden
            />
            <p className="text-foreground/70 text-sm">Your cart is empty.</p>
            <Button
              href="/shop"
              variant="solid"
              size="sm"
            >
              Browse Shop
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
            {/* Cart table */}
            <div className="border-border/60 bg-card rounded-xl border">
              <div className="border-border/60 text-foreground/70 hidden grid-cols-[1fr_120px_160px_140px_40px] items-center gap-4 border-b px-4 py-3 text-sm md:grid">
                <span>Product</span>
                <span>Price</span>
                <span>Quantity</span>
                <span>Subtotal</span>
                <span />
              </div>

              <ul className="divide-border/60 divide-y">
                {items.map(it => (
                  <li
                    key={it.id}
                    className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_120px_160px_140px_40px] md:items-center"
                  >
                    {/* product + inline remove on mobile */}
                    <div className="flex items-center gap-3">
                      <div className="border-border/60 bg-muted/40 relative h-14 w-14 overflow-hidden rounded-md border">
                        <FallbackImage
                          src={it.imageSrc}
                          fallbackSrc={IMAGE_PLACEHOLDERS.product4x3}
                          alt={it.title}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <Link
                          href={`/product/${it.slug}`}
                          className="line-clamp-1 flex-1 text-sm font-medium hover:underline"
                          title={it.title}
                        >
                          {it.title}
                        </Link>

                        {/* X inline with title on mobile only */}
                        <Button
                          variant="ghost"
                          size="sm"
                          icon
                          aria-label={`Remove ${it.title}`}
                          title="Remove item"
                          onClick={() => removeItem(it.id)}
                          className="md:hidden"
                        >
                          <X
                            className="h-4 w-4"
                            aria-hidden
                          />
                        </Button>
                        {it.variantName && (
                          <span className="text-foreground/50 mt-0.5 text-xs">
                            {it.variantName}
                          </span>
                        )}
                        {it.warning && (
                          <span className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-500">
                            <AlertTriangle
                              className="h-3 w-3 shrink-0"
                              aria-hidden
                            />
                            {it.warning}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* price */}
                    <div className="text-sm font-semibold">
                      <span className="text-foreground/60 mb-1 block text-xs md:hidden">Price</span>
                      {fmt(it.priceMinor)}
                    </div>

                    {/* quantity */}
                    <div>
                      <span className="text-foreground/60 mb-1 block text-xs md:hidden">
                        Quantity
                      </span>
                      <Quantity
                        value={it.qty}
                        onChange={q => setItemQty(it.id, q)}
                        max={it.stock ?? 99}
                      />
                    </div>

                    {/* subtotal */}
                    <div className="text-sm font-semibold">
                      <span className="text-foreground/60 mb-1 block text-xs md:hidden">
                        Subtotal
                      </span>
                      {fmt(it.priceMinor * it.qty)}
                    </div>

                    {/* desktop remove column */}
                    <div className="hidden md:flex md:justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon
                        aria-label="Remove item"
                        title="Remove item"
                        onClick={() => removeItem(it.id)}
                      >
                        <X
                          className="h-4 w-4"
                          aria-hidden
                        />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Summary */}
            <div>
              <aside
                aria-labelledby="order-summary-heading"
                className="border-border/60 bg-card h-fit rounded-xl border p-5"
              >
                <h2
                  id="order-summary-heading"
                  className="border-border/60 mb-4 border-b text-base font-semibold"
                >
                  Order Summary
                </h2>

                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-foreground/70">Subtotal</dt>
                    <dd className="font-semibold">{fmt(subMinor)}</dd>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <dt className="text-foreground/90 font-semibold">Total</dt>
                    <dd className="text-base font-extrabold">{fmt(subMinor)}</dd>
                  </div>
                </dl>
                <div className="border-border/60 mb-4 mt-4 border-b" />

                <Button
                  href="/checkout"
                  variant="solid"
                  justify="center"
                  size="lg"
                  fullWidth
                  onClick={e => {
                    if (!authLoading && !isAuthenticated) {
                      e.preventDefault();
                      try {
                        window.sessionStorage.setItem(
                          'mm_post_signin_notice',
                          'checkout_auth_required',
                        );
                      } catch {}
                      window.location.assign('/signin?next=/checkout');
                    }
                  }}
                >
                  Proceed To Checkout
                </Button>
              </aside>

              <div className="hidden items-center justify-between py-4 md:flex">
                <Button
                  href="/shop"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <ArrowLeft
                    className="h-4 w-4"
                    aria-hidden
                  />
                  Continue Shopping
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
