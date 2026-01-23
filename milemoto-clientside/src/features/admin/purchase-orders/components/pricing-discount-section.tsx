import { SectionCard } from './section-card';

import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';

import { DISCOUNT_OPTIONS } from '../constants';

type PricingDiscountSectionProps = {
  title: string;
  discountType: 'fixed' | 'percentage' | undefined;
  discountValue: number | undefined;
  onDiscountTypeChange: (value: 'fixed' | 'percentage' | undefined) => void;
  onDiscountValueChange: (value: number | undefined) => void;
};

export function PricingDiscountSection({
  title,
  discountType,
  discountValue,
  onDiscountTypeChange,
  onDiscountValueChange,
}: PricingDiscountSectionProps) {
  return (
    <SectionCard
      title={title}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Discount Type</Label>
          <Select
            value={discountType ?? 'none'}
            onValueChange={val => {
              if (val === 'none') {
                onDiscountTypeChange(undefined);
                onDiscountValueChange(undefined);
              } else {
                onDiscountTypeChange(val as 'fixed' | 'percentage');
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="No discount" />
            </SelectTrigger>
            <SelectContent>
              {DISCOUNT_OPTIONS.map(option => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {discountType && (
          <div className="space-y-2">
            <Label htmlFor="po-discount-value">Discount Value</Label>
            <Input
              id="po-discount-value"
              type="number"
              value={discountValue ?? ''}
              onChange={e =>
                onDiscountValueChange(
                  e.target.value === '' ? undefined : Number.parseFloat(e.target.value),
                )
              }
              min={0}
            />
          </div>
        )}
      </div>
    </SectionCard>
  );
}
