// src/features/checkout/components/OrderSummary.tsx
'use client';

import * as React from 'react';
import Image from 'next/image';

import { formatPrice } from '@/lib/formatPrice';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';

type Item = {
  id: string;
  title: string;
  imageSrc: string;
  priceMinor: number;
  qty: number;
  warning?: string;
};

type TaxLine = {
  taxId: number;
  name: string;
  type: 'percentage' | 'fixed';
  rate: number;
  amountMinor: number;
};

export default function OrderSummary({
  items,
  subtotalMinor,
  discountMinor = 0,
  shippingMinor,
  taxMinor = 0,
  taxLines = [],
  totalMinor,
  warnings = [],
  errors = [],
  canPlaceOrder = true,
  submitting = false,
  onPay,
}: {
  items: Item[];
  subtotalMinor: number;
  discountMinor?: number;
  shippingMinor: number;
  taxMinor?: number;
  taxLines?: TaxLine[];
  totalMinor: number;
  warnings?: string[];
  errors?: string[];
  canPlaceOrder?: boolean;
  submitting?: boolean;
  onPay: () => void;
}) {
  const [code, setCode] = React.useState('');

  return (
    <div className="border-border/60 bg-card text-foreground rounded-2xl border p-6">
      <h3 className="text-primary mb-4 text-lg font-semibold">Order Summary</h3>

      <ul className="mb-4 space-y-3">
        {items.map(it => (
          <li
            key={it.id}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <Image
                src={it.imageSrc}
                width={56}
                height={56}
                alt=""
                aria-hidden
                className="border-border/60 h-14 w-14 rounded-lg border object-cover"
              />
              <div className="text-sm">
                <div className="font-medium">{it.title}</div>
                <div className="text-muted-foreground">x{it.qty}</div>
                {it.warning ? <div className="text-xs text-amber-600">{it.warning}</div> : null}
              </div>
            </div>
            <div className="text-sm font-medium tabular-nums">{formatPrice(it.priceMinor)}</div>
          </li>
        ))}
      </ul>

      <div className="mb-4">
        <label
          htmlFor="coupon"
          className="block text-sm"
        >
          Apply Discount
        </label>
        <div className="mt-1 flex gap-2">
          <Input
            id="coupon"
            name="coupon"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Enter coupon code"
            autoComplete="off"
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
          >
            Apply
          </Button>
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="mb-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {warnings.map((w, idx) => (
            <div key={`${w}-${idx}`}>{w}</div>
          ))}
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div className="mb-4 space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {errors.map((e, idx) => (
            <div key={`${e}-${idx}`}>{e}</div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-2 text-sm">
        <Row
          label="Subtotal"
          value={formatPrice(subtotalMinor)}
        />
        <Row
          label="Discount"
          value={formatPrice(discountMinor)}
        />
        <Row
          label="Shipping"
          value={formatPrice(shippingMinor)}
        />
        <Row
          label="Tax"
          value={formatPrice(taxMinor)}
        />
        {taxLines.length > 0 ? (
          <div className="border-border/50 ml-2 space-y-1 border-l pl-3">
            {taxLines.map(line => (
              <Row
                key={`${line.taxId}-${line.name}`}
                label={`${line.name} (${line.type === 'percentage' ? `${line.rate}%` : 'fixed'})`}
                value={formatPrice(line.amountMinor)}
              />
            ))}
          </div>
        ) : null}
        <div className="text-primary mt-2 flex items-center justify-between border-t pt-3 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatPrice(totalMinor)}</span>
        </div>
      </div>

      <Button
        type="button"
        variant="solid"
        justify="center"
        size="md"
        fullWidth
        className="mt-6"
        onClick={onPay}
        disabled={submitting || !canPlaceOrder || items.length === 0}
      >
        {submitting ? 'Placing Order...' : 'Place Order'}
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between">
      <span>{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
