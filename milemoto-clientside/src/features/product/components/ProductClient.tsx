'use client';

import { useCallback, useMemo, useState } from 'react';
import { Heart } from 'lucide-react';

import { Breadcrumbs } from '@/features/navigation/Breadcrumbs';
import { BuyActions } from '@/features/product/components/BuyActions';
import { ProductGallery } from '@/features/product/components/ProductGallery';
import { ProductTabs } from '@/features/product/components/ProductTabs';
import { useWishlist } from '@/features/wishlist/wishlist-context';
import { formatUSD } from '@/lib/formatPrice';
import { IMAGE_PLACEHOLDERS } from '@/lib/image-placeholders';
import type { StorefrontProductDetail, StorefrontVariant } from '@/types';

function htmlToSafeText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function ProductClient({ product }: { product: StorefrontProductDetail }) {
  const [selectedVariant, setSelectedVariant] = useState<StorefrontVariant | null>(
    product.variants[0] ?? null,
  );
  const [galleryIndex, setGalleryIndex] = useState(0);
  const { isFavorite, toggleItem } = useWishlist();

  // Build combined image list: base images first, then each variant's image
  const { allImages, variantImageIndex } = useMemo(() => {
    const imgs: { src: string; alt: string }[] = [];
    const idxMap = new Map<number, number>();

    for (const src of product.images) {
      imgs.push({ src, alt: product.name });
    }

    for (const v of product.variants) {
      if (v.imagePath) {
        const existingIdx = imgs.findIndex(img => img.src === v.imagePath);
        if (existingIdx >= 0) {
          idxMap.set(v.id, existingIdx);
        } else {
          idxMap.set(v.id, imgs.length);
          imgs.push({ src: v.imagePath, alt: `${product.name} — ${v.name}` });
        }
      }
    }

    if (imgs.length === 0) {
      imgs.push({ src: IMAGE_PLACEHOLDERS.product4x3, alt: product.name });
    }

    return { allImages: imgs, variantImageIndex: idxMap };
  }, [product]);

  const handleSelectVariant = useCallback(
    (v: StorefrontVariant) => {
      setSelectedVariant(v);
      const imgIdx = variantImageIndex.get(v.id);
      if (imgIdx !== undefined) setGalleryIndex(imgIdx);
    },
    [variantImageIndex],
  );

  const variant = selectedVariant ?? product.variants[0];
  const price = variant?.price ?? 0;
  const stock = variant?.available ?? 0;
  const cartImageSrc = variant?.imagePath ?? allImages[0]?.src ?? IMAGE_PLACEHOLDERS.product4x3;
  const safeLongDescription = useMemo(
    () => (product.longDescription ? htmlToSafeText(product.longDescription) : ''),
    [product.longDescription],
  );
  const favorite = isFavorite(`/product/${product.slug}`);

  return (
    <main className="bg-background text-foreground mx-auto min-h-dvh max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section>
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Shop Parts', href: '/shop' },
            { label: product.name },
          ]}
          showBack
          className="pb-10"
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_520px]">
          {/* Left: gallery */}
          <ProductGallery
            images={allImages}
            activeIndex={galleryIndex}
            onActiveIndexChange={setGalleryIndex}
          />

          {/* Right: details */}
          <article className="border-border/60 bg-card rounded-xl border p-6">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
              <button
                type="button"
                aria-label={favorite ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
                title={favorite ? 'Remove from favorites' : 'Add to favorites'}
                onClick={() =>
                  toggleItem({
                    href: `/product/${product.slug}`,
                    title: product.name,
                    imageSrc: cartImageSrc,
                    imageAlt: product.name,
                    priceMinor: price * 100,
                  })
                }
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  favorite
                    ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                    : 'border-border/60 bg-card text-foreground/80 hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <Heart
                  className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`}
                  aria-hidden
                />
              </button>
            </div>
            {product.shortDescription && (
              <p className="text-foreground/70 mt-2 text-sm">{product.shortDescription}</p>
            )}

            <hr className="border-border/70 my-6" />

            <div className="text-lg font-extrabold">{formatUSD(price * 100)}</div>

            {/* Variant selector */}
            {product.variants.length > 1 && (
              <div className="mt-4">
                <p className="text-foreground/80 mb-2 text-xs font-semibold">Variant</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectVariant(v)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        selectedVariant?.id === v.id
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border text-foreground/80 hover:border-foreground/40'
                      } ${v.available === 0 ? 'opacity-50' : ''}`}
                    >
                      {v.name}
                      {v.available === 0 && (
                        <span className="text-foreground/50 ml-1 text-xs">(Out of stock)</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + CTAs */}
            <BuyActions
              key={variant ? `variant-${variant.id}` : 'product-default'}
              stock={stock}
              slug={product.slug}
              title={product.name}
              {...(product.stockDisplayMode
                ? { stockDisplayMode: product.stockDisplayMode }
                : {})}
              {...(product.lowStockThreshold !== undefined
                ? { lowStockThreshold: product.lowStockThreshold }
                : {})}
              {...(variant?.name ? { variantName: variant.name } : {})}
              priceMinor={price * 100}
              imageSrc={cartImageSrc}
              {...(variant ? { productVariantId: variant.id } : {})}
            />

            <hr className="border-border/70 my-6" />

            <dl className="space-y-2 text-sm">
              {product.brandName && (
                <div className="flex gap-2">
                  <dt className="text-foreground/70 w-28">Brand:</dt>
                  <dd className="flex-1">{product.brandName}</dd>
                </div>
              )}
              {product.categoryName && (
                <div className="flex gap-2">
                  <dt className="text-foreground/70 w-28">Category:</dt>
                  <dd className="flex-1">
                    {product.categoryName}
                    {product.subCategoryName ? ` › ${product.subCategoryName}` : ''}
                  </dd>
                </div>
              )}
              {product.gradeName && (
                <div className="flex gap-2">
                  <dt className="text-foreground/70 w-28">Grade:</dt>
                  <dd className="flex-1">{product.gradeName}</dd>
                </div>
              )}
              {product.warrantyName && (
                <div className="flex gap-2">
                  <dt className="text-foreground/70 w-28">Warranty:</dt>
                  <dd className="flex-1">{product.warrantyName}</dd>
                </div>
              )}
              {variant && (
                <div className="flex gap-2">
                  <dt className="text-foreground/70 w-28">SKU:</dt>
                  <dd className="flex-1 font-mono text-xs">{variant.sku}</dd>
                </div>
              )}
            </dl>
          </article>
        </div>

        {/* Tabs: Description + Specs */}
        <ProductTabs
          tabs={[
            ...(product.longDescription
              ? [
                  {
                    label: 'Description',
                    content: (
                      <div className="text-foreground/90 whitespace-pre-wrap text-sm leading-6">
                        {safeLongDescription}
                      </div>
                    ),
                  },
                ]
              : []),
            ...(product.specifications.length > 0
              ? [
                  {
                    label: 'Specifications',
                    content: (
                      <div className="divide-border/40 divide-y">
                        {product.specifications.map((spec, i) => (
                          <div
                            key={i}
                            className="py-3 first:pt-0 last:pb-0"
                          >
                            <h4 className="text-sm font-semibold">
                              {spec.groupName}: {spec.valueName}
                            </h4>
                            {spec.fields.length > 0 && (
                              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                {spec.fields.map((f, fi) => (
                                  <div
                                    key={fi}
                                    className="contents"
                                  >
                                    <dt className="text-foreground/70">{f.fieldName}</dt>
                                    <dd>{f.value ?? '—'}</dd>
                                  </div>
                                ))}
                              </dl>
                            )}
                          </div>
                        ))}
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </section>
    </main>
  );
}
