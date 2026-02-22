// src/features/product/components/BuyActions.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { useCart } from '@/features/cart/cart-context';
import { Button } from '@/ui/button';
import { Quantity } from '@/ui/Quantity';

type Props = {
  stock: number;
  slug: string;
  title: string;
  variantName?: string;
  priceMinor: number;
  imageSrc: string;
  productVariantId?: number | undefined;
};

export function BuyActions({
  stock,
  slug,
  title,
  variantName,
  priceMinor,
  imageSrc,
  productVariantId,
}: Props) {
  const router = useRouter();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const inStock = stock > 0;
  const quantityMax = Math.max(1, stock);

  const clampToStock = (value: number) => {
    if (!inStock) return 0;
    return Math.max(1, Math.min(value, stock));
  };

  const addToCart = () => {
    if (!inStock) {
      toast.error('This item is currently out of stock.');
      return;
    }
    const safeQty = clampToStock(qty);
    addItem({
      slug,
      title,
      ...(variantName !== undefined ? { variantName } : {}),
      priceMinor,
      imageSrc,
      qty: safeQty,
      stock,
      productVariantId,
    });
    toast.success('Added to cart.');
  };

  const buyNow = () => {
    if (!inStock) {
      toast.error('This item is currently out of stock.');
      return;
    }
    const safeQty = clampToStock(qty);
    addItem({
      slug,
      title,
      ...(variantName !== undefined ? { variantName } : {}),
      priceMinor,
      imageSrc,
      qty: safeQty,
      stock,
      productVariantId,
    });
    router.push('/checkout');
  };

  return (
    <div className="mt-6">
      <p className="text-foreground/80 mb-2 block text-xs font-semibold">Quantity</p>
      <div className="flex items-center gap-4">
        <Quantity
          value={qty}
          onChange={setQty}
          min={1}
          max={quantityMax}
        />
        <div className="text-xs">
          {stock <= 0 ? (
            <>
              <p className="font-semibold text-rose-600">Out of stock</p>
              <p className="text-foreground/70">This variant is currently unavailable</p>
            </>
          ) : stock <= 5 ? (
            <>
              <p className="font-semibold">Only {stock} items left!</p>
              <p className="text-foreground/70">Act soon</p>
            </>
          ) : (
            <>
              <p className="font-semibold">In stock</p>
              <p className="text-foreground/70">{stock} available</p>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="solid"
          size="lg"
          justify="center"
          fullWidth
          className="sm:w-auto"
          onClick={buyNow}
          disabled={!inStock}
        >
          Buy Now
        </Button>
        <Button
          variant="outline"
          size="lg"
          justify="center"
          fullWidth
          className="border-primary text-primary hover:bg-primary/10 sm:w-auto"
          onClick={addToCart}
          disabled={!inStock}
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
