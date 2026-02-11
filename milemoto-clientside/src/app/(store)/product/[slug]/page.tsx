'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import { Loader2 } from 'lucide-react';

import { Breadcrumbs } from '@/features/navigation/Breadcrumbs';
import { BuyActions } from '@/features/product/components/BuyActions';
import { ProductGallery } from '@/features/product/components/ProductGallery';
import { ProductTabs } from '@/features/product/components/ProductTabs';
import { fetchProductBySlug } from '@/lib/storefront';
import { formatUSD } from '@/lib/formatPrice';

import type { StorefrontProductDetail, StorefrontVariant } from '@/types';

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [product, setProduct] = useState<StorefrontProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<StorefrontVariant | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchProductBySlug(slug)
      .then(data => {
        if (cancelled) return;
        setProduct(data);
        // Select the first variant by default
        setSelectedVariant(data.variants[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [slug]);

  // Build combined image list: base images first, then each variant's image
  // Also build a map of variantId -> gallery index
  const { allImages, variantImageIndex } = useMemo(() => {
    if (!product) return { allImages: [] as { src: string; alt: string }[], variantImageIndex: new Map<number, number>() };

    const imgs: { src: string; alt: string }[] = [];
    const idxMap = new Map<number, number>();

    // Base product images
    for (const src of product.images) {
      imgs.push({ src, alt: product.name });
    }

    // Variant-specific images
    for (const v of product.variants) {
      if (v.imagePath) {
        // Check if this image is already in the list (avoid duplicates)
        const existingIdx = imgs.findIndex(img => img.src === v.imagePath);
        if (existingIdx >= 0) {
          idxMap.set(v.id, existingIdx);
        } else {
          idxMap.set(v.id, imgs.length);
          imgs.push({ src: v.imagePath, alt: `${product.name} — ${v.name}` });
        }
      }
    }

    // Fallback if no images at all
    if (imgs.length === 0) {
      imgs.push({ src: '/images/placeholder.png', alt: product.name });
    }

    return { allImages: imgs, variantImageIndex: idxMap };
  }, [product]);

  // When variant changes, slide to its image
  const handleSelectVariant = useCallback((v: StorefrontVariant) => {
    setSelectedVariant(v);
    const imgIdx = variantImageIndex.get(v.id);
    if (imgIdx !== undefined) {
      setGalleryIndex(imgIdx);
    }
  }, [variantImageIndex]);

  if (loading) {
    return (
      <main className="bg-background text-foreground mx-auto flex min-h-dvh max-w-7xl items-center justify-center px-4 py-10">
        <Loader2 className="text-foreground/40 h-10 w-10 animate-spin" />
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="bg-background text-foreground mx-auto flex min-h-dvh max-w-7xl flex-col items-center justify-center px-4 py-10">
        <h1 className="text-2xl font-bold">Product Not Found</h1>
        <p className="text-foreground/70 mt-2 text-sm">
          The product you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
      </main>
    );
  }

  const variant = selectedVariant ?? product.variants[0];
  const price = variant?.price ?? 0;
  const stock = variant?.available ?? 0;

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
          {/* Left: gallery with base + variant images */}
          <ProductGallery images={allImages} activeIndex={galleryIndex} />

          {/* Right: details */}
          <article className="border-border/60 bg-card rounded-xl border p-6">
            <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
            {product.shortDescription && (
              <p className="text-foreground/70 mt-2 text-sm">{product.shortDescription}</p>
            )}

            <hr className="border-border/70 my-6" />

            <div className="text-lg font-extrabold">{formatUSD(price)}</div>

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
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${selectedVariant?.id === v.id
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
              stock={stock}
              slug={product.slug}
              title={product.name}
              priceMinor={price}
              imageSrc={allImages[0]?.src ?? '/images/placeholder.png'}
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
                    <div
                      className="prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: product.longDescription }}
                    />
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
                        <div key={i} className="py-3 first:pt-0 last:pb-0">
                          <h4 className="text-sm font-semibold">
                            {spec.groupName}: {spec.valueName}
                          </h4>
                          {spec.fields.length > 0 && (
                            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                              {spec.fields.map((f, fi) => (
                                <div key={fi} className="contents">
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
