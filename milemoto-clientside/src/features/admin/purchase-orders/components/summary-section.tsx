import { SectionCard } from './section-card';

import type { PurchaseOrderSummary } from '../types';

type CurrencyMeta = {
  symbol?: string | null;
};

type SummarySectionProps = {
  title: string;
  summary: PurchaseOrderSummary;
  decimals: number;
  currencyPosition: 'before' | 'after';
  selectedCurrency: CurrencyMeta | null;
};

export function SummarySection({
  title,
  summary,
  decimals,
  currencyPosition,
  selectedCurrency,
}: SummarySectionProps) {
  const formatAmount = (value: number) => {
    const base = value.toFixed(decimals);
    if (!selectedCurrency || !selectedCurrency.symbol) return base;
    return currencyPosition === 'before'
      ? `${selectedCurrency.symbol} ${base}`
      : `${base} ${selectedCurrency.symbol}`;
  };

  return (
    <SectionCard
      title={title}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-7 text-sm md:grid-cols-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Quantity</span>
          <span className="font-medium">{summary.totalQty}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatAmount(summary.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Discount</span>
          <span className="font-medium">{formatAmount(summary.discountAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span className="font-medium">{formatAmount(summary.shipping)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Before Taxes, Shipping, Discounts</span>
          <span className="font-medium">{formatAmount(summary.totalBeforeTax)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span className="font-medium">{formatAmount(summary.taxTotal)}</span>
        </div>
        <div className="flex justify-between md:col-span-2">
          <span className="text-muted-foreground">Total After Taxes, Shipping, Discounts</span>
          <span className="font-semibold">{formatAmount(summary.totalAfterTax)}</span>
        </div>
      </div>
    </SectionCard>
  );
}
