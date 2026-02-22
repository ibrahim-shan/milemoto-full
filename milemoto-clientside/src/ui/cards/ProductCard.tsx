// src/components/cards/ProductCard.tsx
'use client';

import { memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';

import { formatUSD } from '@/lib/formatPrice';
import { Button } from '@/ui/button';

export type ProductCardProps = {
  title: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  priceMinor: number;
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
  imageSrc,
  imageAlt,
  priceMinor,
  variant = 'overlay',
  imgPriority = false,
  imgLoading = 'lazy',
  imgBlurDataURL,
  locale = 'en-US',
}: ProductCardProps) {
  const price = formatUSD(priceMinor, { locale });

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
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
          priority={imgPriority}
          loading={imgLoading}
          decoding="async"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          {...(imgBlurDataURL ? { placeholder: 'blur' as const, blurDataURL: imgBlurDataURL } : {})}
        />

        {variant === 'overlay' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
            <Button
              href={href}
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
          href={href}
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
              href={href}
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
