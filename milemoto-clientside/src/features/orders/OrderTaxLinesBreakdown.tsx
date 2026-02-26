'use client';

type OrderTaxLineLike = {
  id: number;
  taxId?: number | null;
  taxName: string;
  taxType: string;
  taxRate: number;
  countryId?: number | null;
  amount: number;
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || 'USD'}`;
  }
}

function formatTaxMeta(line: OrderTaxLineLike): string {
  if (line.taxType === 'percentage') return `${line.taxRate}%`;
  if (line.taxType === 'fixed') return 'Fixed';
  return line.taxType;
}

export function OrderTaxLinesBreakdown({
  taxLines,
  currency,
  title = 'Tax Breakdown',
}: {
  taxLines: OrderTaxLineLike[];
  currency: string;
  title?: string;
}) {
  if (taxLines.length === 0) return null;

  return (
    <div className="border-border/60 bg-card rounded-xl border p-6">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">
        {taxLines.map(line => (
          <div
            key={line.id}
            className="border-border/60 flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="font-medium">{line.taxName}</p>
              <p className="text-muted-foreground text-xs">
                {formatTaxMeta(line)}
                {line.countryId ? ` | Country #${line.countryId}` : ''}
                {line.taxId ? ` | Rule #${line.taxId}` : ''}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold">{formatMoney(line.amount, currency)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrderTaxLinesBreakdown;
