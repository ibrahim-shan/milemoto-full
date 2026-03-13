// src/components/cards/ProductCard.tsx
'use client';

import { memo, useSyncExternalStore } from 'react';
import Link from 'next/link';

import { motion } from 'framer-motion';
import { Eye, Heart, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

import { useCart } from '@/features/cart/cart-context';
import { useWishlist } from '@/features/wishlist/wishlist-context';
import { formatUSD } from '@/lib/formatPrice';
import { IMAGE_PLACEHOLDERS } from '@/lib/image-placeholders';
import { Button } from '@/ui/button';
import { FallbackImage } from '@/ui/fallback-image';
import { StatusBadge } from '@/ui/status-badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip';

export type ProductCardProps = {
  title: string;
  href: string;
  viewHref?: string;
  favoriteKeyHref?: string;
  imageSrc: string;
  imageAlt: string;
  priceMinor: number;
  outOfStock?: boolean;
  productSlug?: string;
  quickAddVariantId?: number;
  quickAddStock?: number;
  imgPriority?: boolean;
  imgLoading?: 'eager' | 'lazy';
  imgBlurDataURL?: string;
  variant?: 'overlay' | 'inline';
  /** @deprecated — no longer used; quick-add replaced with View Details */
  onAdd?: () => Promise<void> | void;
  locale?: string;
};

function ProductCardInner({
  title,
  href,
  viewHref = href,
  favoriteKeyHref = href,
  imageSrc,
  imageAlt,
  priceMinor,
  outOfStock = false,
  productSlug,
  quickAddVariantId,
  quickAddStock,
  variant = 'overlay',
  imgPriority = false,
  imgLoading = 'lazy',
  imgBlurDataURL,
  onAdd,
  locale = 'en-US',
}: ProductCardProps) {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const price = formatUSD(priceMinor, { locale });
  const { addItem, items } = useCart();
  const { isFavorite, toggleItem } = useWishlist();
  const favorite = isFavorite(favoriteKeyHref);
  const normalizedQuickAddStock =
    quickAddStock === undefined || quickAddStock === null ? undefined : Number(quickAddStock);
  const quickAddStockInt =
    normalizedQuickAddStock !== undefined && Number.isFinite(normalizedQuickAddStock)
      ? Math.max(0, Math.floor(normalizedQuickAddStock))
      : undefined;
  const currentCartQty =
    isHydrated && quickAddVariantId != null
      ? (items.find(it => it.productVariantId === quickAddVariantId)?.qty ?? 0)
      : 0;
  const hasQuickAdd = quickAddVariantId != null && !!productSlug;
  const quickAddReachedMax =
    hasQuickAdd && quickAddStockInt !== undefined && quickAddStockInt <= currentCartQty;
  const quickAddDisabled =
    !hasQuickAdd || (quickAddStockInt !== undefined && quickAddStockInt <= 0) || quickAddReachedMax;
  const quickAddTooltip = quickAddDisabled
    ? quickAddStockInt !== undefined && quickAddStockInt <= 0
      ? 'Out of stock'
      : 'Max quantity in cart'
    : 'Add to cart';

  return (
    <motion.article
      itemScope
      itemType="https://schema.org/Product"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="border-border/60 bg-card hover:border-border focus-within:ring-ring group relative flex flex-col rounded-xl border p-4 transition-colors focus-within:ring-2"
    >
      <div className="aspect-4/3 relative mx-auto w-full overflow-hidden rounded-lg">
        <FallbackImage
          src={imageSrc}
          fallbackSrc={IMAGE_PLACEHOLDERS.product4x3}
          alt={imageAlt}
          fill
          sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
          priority={imgPriority}
          loading={imgLoading}
          decoding="async"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          {...(imgBlurDataURL ? { placeholder: 'blur' as const, blurDataURL: imgBlurDataURL } : {})}
        />
        {outOfStock ? (
          <StatusBadge
            variant="error"
            className="absolute left-2 top-2 z-20 uppercase tracking-wide"
          >
            Out of Stock
          </StatusBadge>
        ) : null}

        <div className="absolute right-2 top-2 z-20 flex items-center gap-2">
          {hasQuickAdd ? (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <button
                      type="button"
                      aria-label={
                        quickAddDisabled
                          ? `Cannot add ${title} to cart: ${quickAddTooltip}`
                          : `Add ${title} to cart`
                      }
                      title={quickAddTooltip}
                      onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (quickAddDisabled) {
                          toast.info(
                            quickAddStockInt !== undefined && quickAddStockInt <= 0
                              ? 'This product is out of stock'
                              : 'Maximum available quantity already in cart',
                          );
                          return;
                        }
                        addItem({
                          slug: productSlug,
                          title,
                          imageSrc,
                          priceMinor,
                          productVariantId: quickAddVariantId,
                          ...(quickAddStockInt !== undefined ? { stock: quickAddStockInt } : {}),
                          qty: 1,
                        });
                        toast.success('Added to cart');
                        onAdd?.();
                      }}
                      disabled={quickAddDisabled}
                      className="border-border/60 bg-background/85 text-foreground hover:bg-background disabled:text-foreground/40 disabled:hover:bg-background/85 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <ShoppingCart
                        className="h-4 w-4"
                        aria-hidden
                      />
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">{quickAddTooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}

          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={
                    favorite ? `Remove ${title} from favorites` : `Add ${title} to favorites`
                  }
                  title={favorite ? 'Remove from favorites' : 'Add to favorites'}
                  onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleItem({ href: favoriteKeyHref, title, imageSrc, imageAlt, priceMinor });
                  }}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-colors ${
                    favorite
                      ? 'border-rose-200 bg-rose-50/95 text-rose-600 hover:bg-rose-100'
                      : 'border-border/60 bg-background/85 text-foreground hover:bg-background'
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`}
                    aria-hidden
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {favorite ? 'Remove from favorites' : 'Add to favorites'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {variant === 'overlay' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
            <Button
              href={viewHref}
              size="sm"
              variant="solid"
              justify="center"
              aria-label={`View details for ${title}`}
              leftIcon={
                <Eye
                  className="h-4 w-4"
                  aria-hidden
                />
              }
            >
              View Details
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4">
        <Link
          href={viewHref}
          prefetch={false}
          className="text-foreground/90 focus-visible:ring-ring rounded text-sm hover:underline focus-visible:outline-none focus-visible:ring-2"
          aria-label={title}
        >
          <span itemProp="name">{title}</span>
        </Link>

        <div className="text-md text-foreground mt-1 font-extrabold tracking-tight">
          <span
            itemProp="offers"
            itemScope
            itemType="https://schema.org/Offer"
          >
            <meta
              itemProp="priceCurrency"
              content="USD"
            />
            <span
              itemProp="price"
              content={(priceMinor / 100).toString()}
            >
              {price}
            </span>
          </span>
          <span className="sr-only"> price</span>
        </div>

        {variant === 'inline' && (
          <div className="mt-2">
            <Button
              href={viewHref}
              variant="solid"
              size="sm"
              justify="center"
              fullWidth
              aria-label={`View details for ${title}`}
              leftIcon={
                <Eye
                  className="h-4 w-4"
                  aria-hidden
                />
              }
            >
              View Details
            </Button>
          </div>
        )}
      </div>
    </motion.article>
  );
}

export const ProductCard = memo(ProductCardInner);
