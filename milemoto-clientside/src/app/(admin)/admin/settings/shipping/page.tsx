'use client';

import { OrderAreaTable } from '@/features/admin/settings/shipping/order-area-table';
import { SettingInputCard } from '@/features/admin/settings/shipping/setting-input-card';
import { Skeleton } from '@/features/feedback/Skeleton';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { useGetShippingMethods, useUpdateShippingMethod } from '@/hooks/useShippingQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Label } from '@/ui/label';
import { Switch } from '@/ui/switch';

// ==== Helper Component for Toggles ====
function ToggleItem({
  id,
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <Label
        htmlFor={id}
        className="flex-1 cursor-pointer"
      >
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

// ==== Main Page Component ====
export default function ShippingPage() {
  // Fetch methods from API
  const { data: methods, isLoading } = useGetShippingMethods();
  const updateMethodMutation = useUpdateShippingMethod();
  const { symbol: currencySymbol } = useDefaultCurrency();

  const handleToggle = (code: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    updateMethodMutation.mutate({ code, status: newStatus });
  };

  // Helpers to find method status
  const productMethod = methods?.find(m => m.code === 'productWise');
  const flatMethod = methods?.find(m => m.code === 'flatRate');
  const areaMethod = methods?.find(m => m.code === 'areaWise');

  const isProductActive = productMethod?.status === 'active';
  const isFlatActive = flatMethod?.status === 'active';
  const isAreaActive = areaMethod?.status === 'active';

  const handleSaveFlatCost = (cost: number) => {
    updateMethodMutation.mutate({ code: 'flatRate', cost });
  };

  const handleSaveAreaDefaultCost = (cost: number) => {
    updateMethodMutation.mutate({ code: 'areaWise', cost });
  };

  return (
    <div className="space-y-6">
      {/* 1. Shipping Method Selection Card (Using Toggles) */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (
            <>
              <ToggleItem
                id="product"
                label="Product Wise"
                checked={isProductActive}
                onCheckedChange={() =>
                  handleToggle('productWise', productMethod?.status || 'inactive')
                }
              />
              <ToggleItem
                id="flat"
                label="Flat Rate Wise"
                checked={isFlatActive}
                onCheckedChange={() => handleToggle('flatRate', flatMethod?.status || 'inactive')}
              />
              <ToggleItem
                id="area"
                label="Area Wise"
                checked={isAreaActive}
                onCheckedChange={() => handleToggle('areaWise', areaMethod?.status || 'inactive')}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* 2. Conditional "Flat Rate" Card */}
      {isFlatActive && (
        <SettingInputCard
          title="Flat Rate Wise"
          label="Shipping Cost"
          id="flat-cost"
          placeholder="Enter flat shipping cost"
          defaultValue={Number(flatMethod?.cost ?? 0)}
          onSave={handleSaveFlatCost}
          isPending={updateMethodMutation.isPending}
          currencySymbol={currencySymbol}
        />
      )}

      {/* 3. Conditional "Area Wise" Cards */}
      {isAreaActive && (
        <div className="space-y-6">
          <SettingInputCard
            title="Area Wise"
            label="Default Shipping Cost (Fallback)"
            id="area-default-cost"
            placeholder="Enter default cost"
            defaultValue={Number(areaMethod?.cost ?? 0)}
            onSave={handleSaveAreaDefaultCost}
            isPending={updateMethodMutation.isPending}
            currencySymbol={currencySymbol}
          />
          <OrderAreaTable />
        </div>
      )}
    </div>
  );
}
