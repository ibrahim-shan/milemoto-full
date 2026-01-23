import { SectionCard } from './section-card';

import { GeneralCombobox } from '@/ui/combobox';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';

type NameOption = {
  id: number;
  name: string;
};

type VendorShippingSectionProps = {
  title: string;
  vendorId: number | null;
  onVendorChange: (value: string | number) => void;
  vendorSearch: string;
  onVendorSearchChange: (value: string) => void;
  vendors: NameOption[];
  stockLocationId: number | null;
  onStockLocationChange: (value: string | number) => void;
  stockLocationSearch: string;
  onStockLocationSearchChange: (value: string) => void;
  stockLocations: NameOption[];
  paymentMethodId: number | null;
  onPaymentMethodChange: (value: string | number) => void;
  paymentMethodSearch: string;
  onPaymentMethodSearchChange: (value: string) => void;
  paymentMethods: NameOption[];
  inboundShippingMethodId: number | null;
  onInboundShippingMethodChange: (value: string | number) => void;
  inboundShippingSearch: string;
  onInboundShippingSearchChange: (value: string) => void;
  inboundShippingMethods: NameOption[];
  shippingCost: number | undefined;
  onShippingCostChange: (value: number | undefined) => void;
};

export function VendorShippingSection({
  title,
  vendorId,
  onVendorChange,
  vendorSearch,
  onVendorSearchChange,
  vendors,
  stockLocationId,
  onStockLocationChange,
  stockLocationSearch,
  onStockLocationSearchChange,
  stockLocations,
  paymentMethodId,
  onPaymentMethodChange,
  paymentMethodSearch,
  onPaymentMethodSearchChange,
  paymentMethods,
  inboundShippingMethodId,
  onInboundShippingMethodChange,
  inboundShippingSearch,
  onInboundShippingSearchChange,
  inboundShippingMethods,
  shippingCost,
  onShippingCostChange,
}: VendorShippingSectionProps) {
  return (
    <SectionCard
      title={title}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Vendor</Label>
          <GeneralCombobox
            placeholder="Select vendor"
            value={vendorId ? String(vendorId) : ''}
            onChange={onVendorChange}
            searchValue={vendorSearch}
            onSearchChange={onVendorSearchChange}
            className="w-full"
            data={vendors.map(v => ({
              value: String(v.id),
              label: v.name,
              searchValue: v.name,
            }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Stock Location</Label>
          <GeneralCombobox
            placeholder="Select stock location"
            value={stockLocationId ? String(stockLocationId) : ''}
            onChange={onStockLocationChange}
            searchValue={stockLocationSearch}
            onSearchChange={onStockLocationSearchChange}
            className="w-full"
            data={stockLocations.map(loc => ({
              value: String(loc.id),
              label: loc.name,
              searchValue: loc.name,
            }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Payment Method</Label>
          <GeneralCombobox
            placeholder="Select payment method"
            value={paymentMethodId ? String(paymentMethodId) : 'none'}
            onChange={onPaymentMethodChange}
            searchValue={paymentMethodSearch}
            onSearchChange={onPaymentMethodSearchChange}
            className="w-full"
            data={[
              {
                value: 'none',
                label: 'No specific method',
                searchValue: 'No specific method',
              },
              ...paymentMethods.map(pm => ({
                value: String(pm.id),
                label: pm.name,
                searchValue: pm.name,
              })),
            ]}
          />
        </div>

        <div className="space-y-2">
          <Label>Inbound Shipping Method</Label>
          <GeneralCombobox
            placeholder="Select inbound shipping method"
            value={inboundShippingMethodId ? String(inboundShippingMethodId) : 'none'}
            onChange={onInboundShippingMethodChange}
            searchValue={inboundShippingSearch}
            onSearchChange={onInboundShippingSearchChange}
            className="w-full"
            data={[
              {
                value: 'none',
                label: 'No specific method',
                searchValue: 'No specific method',
              },
              ...inboundShippingMethods.map(method => ({
                value: String(method.id),
                label: method.name,
                searchValue: method.name,
              })),
            ]}
          />
        </div>

        {inboundShippingMethodId && (
          <div className="space-y-2">
            <Label htmlFor="po-shipping-cost">Shipping Cost</Label>
            <Input
              id="po-shipping-cost"
              type="number"
              min={0}
              step="0.01"
              value={shippingCost ?? ''}
              onChange={e =>
                onShippingCostChange(
                  e.target.value === '' ? undefined : Number.parseFloat(e.target.value),
                )
              }
            />
          </div>
        )}
      </div>
    </SectionCard>
  );
}
