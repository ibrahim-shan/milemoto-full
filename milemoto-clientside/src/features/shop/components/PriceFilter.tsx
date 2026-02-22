// src/features/shop/components/PriceFilter.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

import { RefreshCw } from 'lucide-react';

import { Button } from '@/ui/button';
import { Slider } from '@/ui/slider';

const ABSOLUTE_MIN = 0;
const DEFAULT_MAX = 1000;

/**
 * Returns a "nice" step value that produces round slider ticks.
 * e.g. max=100 → step=5, max=1000 → step=50, max=5000 → step=100
 */
function niceStep(max: number): number {
  if (max <= 0) return 1;
  const rough = max / 20;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const n = rough / pow;
  const factor = n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10;
  return factor * pow;
}

/**
 * Round a value to the nearest multiple of `step`.
 */
function snapToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Generate 3 evenly-spaced preset ranges rounded to nice step boundaries.
 */
function makePresets(max: number, step: number) {
  const q1 = snapToStep(max * 0.25, step);
  const q2 = snapToStep(max * 0.5, step);
  const q3 = snapToStep(max * 0.75, step);
  return [
    { min: 0, max: q2 },
    { min: q1, max: q3 },
    { min: q2, max },
  ];
}

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`;
}

export function PriceFilter({
  maxPrice: maxPriceProp,
  valueMinPrice,
  valueMaxPrice,
  onApply,
}: {
  maxPrice?: number | undefined;
  valueMinPrice?: number | undefined;
  valueMaxPrice?: number | undefined;
  onApply?: ((min: number, max: number) => void) | undefined;
}) {
  const max = maxPriceProp && maxPriceProp > 0 ? maxPriceProp : DEFAULT_MAX;
  const step = niceStep(max);
  const [range, setRange] = useState<[number, number]>([ABSOLUTE_MIN, max]);
  const prevMaxRef = useRef(max);

  useEffect(() => {
    const prevMax = prevMaxRef.current;
    if (prevMax === max) return;

    setRange(([min, currentMax]) => {
      // If user is still on the previous "full range", expand to the new max.
      if (min === ABSOLUTE_MIN && currentMax === prevMax) {
        return [ABSOLUTE_MIN, max];
      }

      const nextMin = Math.min(min, max);
      const nextMax = Math.min(currentMax, max);
      return [Math.min(nextMin, nextMax), nextMax];
    });

    prevMaxRef.current = max;
  }, [max]);

  useEffect(() => {
    const nextMinRaw = valueMinPrice ?? ABSOLUTE_MIN;
    const nextMaxRaw = valueMaxPrice ?? max;
    const nextMin = Math.max(ABSOLUTE_MIN, Math.min(nextMinRaw, max));
    const nextMax = Math.max(nextMin, Math.min(nextMaxRaw, max));

    setRange(prev => (prev[0] === nextMin && prev[1] === nextMax ? prev : [nextMin, nextMax]));
  }, [valueMinPrice, valueMaxPrice, max]);

  const handleReset = () => {
    setRange([ABSOLUTE_MIN, max]);
    onApply?.(ABSOLUTE_MIN, max);
  };
  const handleApply = () => onApply?.(range[0], range[1]);

  const presets = makePresets(max, step);

  return (
    <div className="rounded-xl">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-foreground text-base font-semibold">Price Range</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          title="Reset price filter"
          className="text-foreground/70 hover:text-primary gap-2 hover:bg-transparent"
        >
          <RefreshCw
            className="h-4 w-4"
            aria-hidden
          />
          Reset
        </Button>
      </div>

      {/* Current range display */}
      <div className="text-foreground/70 mb-3 flex justify-between text-sm font-medium">
        <span>{fmt(range[0])}</span>
        <span>{fmt(range[1])}</span>
      </div>

      {/* Dual-thumb Slider */}
      <Slider
        min={ABSOLUTE_MIN}
        max={max}
        step={step}
        value={range}
        onValueChange={v => setRange(v as [number, number])}
        aria-label="Price range"
        className="mb-6"
      />

      {/* Presets */}
      <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {presets.map(p => {
          const active = range[0] === p.min && range[1] === p.max;
          return (
            <Button
              key={`${p.min}-${p.max}`}
              variant={active ? 'secondary' : 'subtle'}
              size="sm"
              fullWidth
              aria-pressed={active}
              onClick={() => setRange([p.min, p.max])}
            >
              {fmt(p.min)}–{fmt(p.max)}
            </Button>
          );
        })}
      </div>

      {/* Apply */}
      <Button
        variant="solid"
        justify="center"
        size="md"
        fullWidth
        onClick={handleApply}
      >
        Apply
      </Button>
    </div>
  );
}
