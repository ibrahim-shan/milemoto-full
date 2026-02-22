// src/components/product/ProductGallery.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import { cn } from '@/lib/utils';

type Props = {
  images: { src: string; alt: string }[];
  /** Controlled active image index */
  activeIndex?: number | undefined;
  /** Controlled mode change handler */
  onActiveIndexChange?: ((index: number) => void) | undefined;
};

export function ProductGallery({ images, activeIndex, onActiveIndexChange }: Props) {
  const [idx, setIdx] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  // derive a safe index instead of setState in an effect
  const maxIndex = Math.max(0, images.length - 1);
  const hasControlledIndex =
    activeIndex !== undefined && activeIndex >= 0 && activeIndex < images.length;
  const viewIdx = Math.min(hasControlledIndex ? activeIndex : idx, maxIndex);

  const setCurrentIndex = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, maxIndex));
      if (hasControlledIndex && onActiveIndexChange) {
        onActiveIndexChange(clamped);
        return;
      }
      setIdx(clamped);
    },
    [maxIndex, hasControlledIndex, onActiveIndexChange],
  );

  // keyboard arrows
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setCurrentIndex(viewIdx + 1);
      if (e.key === 'ArrowLeft') setCurrentIndex(viewIdx - 1);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [viewIdx, setCurrentIndex]);

  if (images.length === 0) {
    return (
      <section
        aria-label="Product images"
        className="space-y-4"
      >
        <div className="border-border/60 bg-card aspect-4/3 relative w-full rounded-xl border" />
      </section>
    );
  }

  if (!images[viewIdx]) return null;
  const current = images[viewIdx];

  return (
    <section
      aria-label="Product images"
      className="space-y-4"
    >
      <div className="border-border/60 bg-card aspect-4/3 relative w-full overflow-hidden rounded-xl border">
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          fill
          priority
          loading="eager"
          sizes="(min-width:1024px) 640px, 100vw"
          decoding="async"
          className="object-cover"
        />
      </div>

      <div
        ref={listRef}
        className="grid grid-cols-5 gap-3"
      >
        {images.map((img, i) => {
          const active = i === viewIdx;
          return (
            <button
              key={img.src + i}
              type="button"
              aria-label={`Thumbnail ${i + 1}`}
              aria-pressed={active}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                'aspect-4/3 relative overflow-hidden rounded-lg border',
                active ? 'border-primary ring-ring ring-0' : 'border-border/60 hover:border-border',
              )}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                loading="lazy"
                decoding="async"
                sizes="120px"
                className="object-cover"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
