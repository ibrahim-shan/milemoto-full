import { SectionCard } from './section-card';
import { ChevronDownIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Calendar } from '@/ui/calendar';
import { GeneralCombobox } from '@/ui/combobox';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';

type CurrencyOption = {
  id: number;
  code: string;
  symbol: string;
};

type BasicInfoSectionProps = {
  title: string;
  subject: string;
  onSubjectChange: (value: string) => void;
  paymentTerms: string;
  onPaymentTermsChange: (value: string) => void;
  deliveryOpen: boolean;
  onDeliveryOpenChange: (open: boolean) => void;
  deliveryLabel: string;
  selectedDeliveryDate: Date | undefined;
  onDeliverySelect: (date?: Date) => void;
  currencyId: number | null;
  onCurrencyChange: (value: string | number) => void;
  currencies: CurrencyOption[];
};

export function BasicInfoSection({
  title,
  subject,
  onSubjectChange,
  paymentTerms,
  onPaymentTermsChange,
  deliveryOpen,
  onDeliveryOpenChange,
  deliveryLabel,
  selectedDeliveryDate,
  onDeliverySelect,
  currencyId,
  onCurrencyChange,
  currencies,
}: BasicInfoSectionProps) {
  return (
    <SectionCard
      title={title}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="po-subject">Subject</Label>
          <Input
            id="po-subject"
            value={subject}
            onChange={e => onSubjectChange(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="po-terms">Payment Terms</Label>
          <Input
            id="po-terms"
            value={paymentTerms}
            onChange={e => onPaymentTermsChange(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="po-delivery-date">Delivery Date</Label>
          <Popover
            open={deliveryOpen}
            onOpenChange={onDeliveryOpenChange}
          >
            <PopoverTrigger asChild>
              <button
                id="po-delivery-date"
                type="button"
                className={cn(
                  'border-input file:text-foreground placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-1 text-left text-sm font-normal shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
                  deliveryLabel === 'Pick a date' && 'text-muted-foreground',
                )}
              >
                {deliveryLabel}
                <ChevronDownIcon className="ml-2 h-4 w-4 opacity-70" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-auto min-w-56 p-0"
            >
              <Calendar
                mode="single"
                selected={selectedDeliveryDate}
                captionLayout="dropdown"
                disabled={day => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return day < today;
                }}
                onSelect={onDeliverySelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Currency</Label>
          <GeneralCombobox
            placeholder="Select currency"
            value={currencyId ? String(currencyId) : ''}
            onChange={onCurrencyChange}
            className="w-full"
            data={currencies.map(c => ({
              value: String(c.id),
              label: `${c.code} (${c.symbol})`,
              searchValue: `${c.code} ${c.symbol}`,
            }))}
          />
        </div>
      </div>
    </SectionCard>
  );
}
