'use client';

import { Heart } from 'lucide-react';

import { useWishlist } from '@/features/wishlist/wishlist-context';
import { Breadcrumbs } from '@/features/navigation/Breadcrumbs';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { ProductCard } from '@/ui/cards/ProductCard';
import { Card, CardContent } from '@/ui/card';

export function FavoritesClient() {
  const { items, count, clear } = useWishlist();

  return (
    <main className="bg-background text-foreground mx-auto min-h-dvh max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section>
        <Breadcrumbs
          items={[{ label: 'Home', href: '/' }, { label: 'Favorites' }]}
          showBack
          className="pb-8"
        />
      </section>

      <section className="mb-8 flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Heart
              className="h-5 w-5 text-rose-500"
              aria-hidden
            />
            <h1 className="text-2xl font-bold tracking-tight">Favorites</h1>
            <Badge
              variant="secondary"
              className="rounded-full"
            >
              {count} items
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Save products you like and come back to them anytime.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            href="/shop"
            variant="solid" 
            size="sm"
          >
            Continue Shopping
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={clear}
            disabled={count === 0}
          >
            Clear Favorites
          </Button>
        </div>
      </section>

      {count === 0 ? (
        <Card className="border-dashed border-border/60 bg-card/40">
          <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="bg-rose-50 text-rose-600 inline-flex h-12 w-12 items-center justify-center rounded-full border border-rose-100">
              <Heart
                className="h-5 w-5"
                aria-hidden
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Your favorites list is empty</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Tap the heart icon on product cards to save items here.
              </p>
            </div>
            <Button
              href="/shop"
              variant="solid"
              size="sm"
            >
              Browse Products
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map(item => (
              <ProductCard
                key={item.href}
                title={item.title}
                href={item.href}
                imageSrc={item.imageSrc}
                imageAlt={item.imageAlt}
                priceMinor={item.priceMinor}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default FavoritesClient;

