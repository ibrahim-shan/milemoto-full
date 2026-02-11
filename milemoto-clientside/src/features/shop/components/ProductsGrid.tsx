// src/components/shop/ProductsGrid.tsx
'use client';

import { Loader2 } from 'lucide-react';

import { ProductCard } from '@/ui/cards/ProductCard';
import type { StorefrontProductListItem } from '@/types';

export type ProductGridItem = StorefrontProductListItem;

type SortKey = 'default' | 'price-asc' | 'price-desc' | 'title-asc';

export function ProductsGrid({
  products,
  loading = false,
  cardVariant = 'overlay',
  onAdd,
}: {
  products: ProductGridItem[];
  loading?: boolean;
  cardVariant?: 'overlay' | 'inline';
  onAdd?: (p: ProductGridItem) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="text-foreground/40 h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (products.length === 0) {
    return <p className="text-foreground/70 py-10 text-center text-sm">No products found.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-3">
      {products.map((p, i) => (
        <ProductCard
          key={p.id}
          title={p.name}
          href={`/product/${p.slug}`}
          imageSrc={p.imageSrc || '/images/placeholder.png'}
          imageAlt={p.name}
          priceMinor={p.startingPrice ?? 0}
          variant={cardVariant}
          onAdd={() => onAdd?.(p)}
          imgPriority={i === 0}
          imgLoading={i === 0 ? 'eager' : 'lazy'}
        />
      ))}
    </div>
  );
}
