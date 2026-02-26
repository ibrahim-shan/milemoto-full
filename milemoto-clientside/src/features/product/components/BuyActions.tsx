// src/features/product/components/BuyActions.tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { useCart } from '@/features/cart/cart-context';
import { useAuth } from '@/hooks/useAuth';
import { addServerCartItem } from '@/lib/cart';
import { Button } from '@/ui/button';
import { Quantity } from '@/ui/Quantity';

type Props = {
  stock: number;
  stockDisplayMode?: 'exact' | 'low_stock_only' | 'binary' | 'hide';
  lowStockThreshold?: number;
  slug: string;
  title: string;
  variantName?: string;
  priceMinor: number;
  imageSrc: string;
  productVariantId?: number | undefined;
};

export function BuyActions({
  stock,
  stockDisplayMode = 'low_stock_only',
  lowStockThreshold = 5,
  slug,
  title,
  variantName,
  priceMinor,
  imageSrc,
  productVariantId,
}: Props) {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { addItem, items } = useCart();
  const [qty, setQty] = useState(1);
  const [buyingNow, setBuyingNow] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [stockOverride, setStockOverride] = useState<number | null>(null);
  const effectiveStock = stockOverride ?? stock;
  const cartQtyForVariant = useMemo(() => {
    if (productVariantId == null) return 0;
    const id = `${slug}::${productVariantId}`;
    return items.find(it => it.id === id)?.qty ?? 0;
  }, [items, productVariantId, slug]);
  const remainingAddable = Math.max(0, effectiveStock - cartQtyForVariant);
  const inStock = effectiveStock > 0;
  const canAddMore = remainingAddable > 0;
  const quantityMax = Math.max(1, canAddMore ? remainingAddable : effectiveStock);
  const showLowStockMessage = effectiveStock <= lowStockThreshold;

  const clampToStock = (value: number) => {
    if (!inStock || !canAddMore) return 0;
    return Math.max(1, Math.min(value, remainingAddable));
  };

  const handleServerStockError = (err: unknown, fallbackMessage: string) => {
    const e = err as { code?: string; message?: string };
    const code = (e.code || '').toLowerCase();
    if (code === 'outofstock') {
      setStockOverride(0);
      setQty(1);
      toast.error('This item just went out of stock. Please choose another variant.');
      return true;
    }
    if (code === 'insufficientstock') {
      toast.error(e.message || 'No more units available for this item.');
      return true;
    }
    toast.error(e.message || fallbackMessage);
    return false;
  };

  const addToCart = async () => {
    if (!inStock || !canAddMore) {
      toast.error('This item is currently out of stock.');
      return;
    }
    if (addingToCart) return;
    const safeQty = clampToStock(qty);

    if (!authLoading && isAuthenticated) {
      if (!productVariantId) {
        toast.error('Please select a valid product variant before adding to cart.');
        return;
      }
      setAddingToCart(true);
      try {
        const result = await addServerCartItem({ productVariantId, quantity: safeQty });
        if (!result) {
          toast.error('Failed to add item to cart. Please try again.');
          return;
        }
      } catch (err) {
        handleServerStockError(err, 'Failed to add item to cart. Please try again.');
        return;
      } finally {
        setAddingToCart(false);
      }
    }

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

  const buyNow = async () => {
    if (!inStock || !canAddMore) {
      toast.error('This item is currently out of stock.');
      return;
    }
    if (buyingNow) return;
    const safeQty = clampToStock(qty);
    if (!authLoading && !isAuthenticated) {
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
      try {
        window.sessionStorage.setItem('mm_post_signin_notice', 'checkout_auth_required');
      } catch {}
      router.push('/signin?next=/checkout');
      return;
    }

    if (!productVariantId) {
      toast.error('Please select a valid product variant before checkout.');
      return;
    }

    setBuyingNow(true);
    try {
      const result = await addServerCartItem({ productVariantId, quantity: safeQty });
      if (!result) {
        toast.error('Failed to prepare checkout. Please try again.');
        return;
      }
      router.push('/checkout');
    } catch (err) {
      handleServerStockError(err, 'Failed to prepare checkout. Please try again.');
      return;
    } finally {
      setBuyingNow(false);
    }
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
          {stockDisplayMode === 'hide' ? null : effectiveStock <= 0 ? (
            <>
              <p className="font-semibold text-rose-600">Out of stock</p>
              <p className="text-foreground/70">This variant is currently unavailable</p>
            </>
          ) : !canAddMore ? (
            <>
              <p className="font-semibold text-amber-600">Max quantity in cart</p>
              <p className="text-foreground/70">
                You already have {cartQtyForVariant} of {effectiveStock}
              </p>
            </>
          ) : stockDisplayMode === 'binary' ? (
            <>
              <p className="font-semibold">In stock</p>
              <p className="text-foreground/70">Available</p>
            </>
          ) : stockDisplayMode === 'exact' ? (
            <>
              <p className="font-semibold">In stock</p>
              <p className="text-foreground/70">{remainingAddable} available to add</p>
            </>
          ) : showLowStockMessage ? (
            <>
              <p className="font-semibold">Only {remainingAddable} items left to add!</p>
              <p className="text-foreground/70">Act soon</p>
            </>
          ) : (
            <>
              <p className="font-semibold">In stock</p>
              <p className="text-foreground/70">Available</p>
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
          disabled={!inStock || !canAddMore || buyingNow}
        >
          {buyingNow ? 'Preparing...' : 'Buy Now'}
        </Button>
        <Button
          variant="outline"
          size="lg"
          justify="center"
          fullWidth
          className="border-primary text-primary hover:bg-primary/10 sm:w-auto"
          onClick={addToCart}
          disabled={!inStock || !canAddMore || addingToCart}
        >
          {addingToCart ? 'Adding...' : 'Add to Cart'}
        </Button>
      </div>
    </div>
  );
}
