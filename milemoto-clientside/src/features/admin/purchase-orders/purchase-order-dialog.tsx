'use client';

import { SECTION_TITLES } from './constants';
import type { CreatePurchaseOrderDto, PurchaseOrderResponse } from '@milemoto/types';

import { Button } from '@/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';

import { BasicInfoSection } from './components/basic-info-section';
import { LineItemsSection } from './components/line-items-section';
import { NotesSection } from './components/notes-section';
import { PricingDiscountSection } from './components/pricing-discount-section';
import { SummarySection } from './components/summary-section';
import { VendorShippingSection } from './components/vendor-shipping-section';
import { usePurchaseOrderForm } from './hooks/usePurchaseOrderForm';

type PurchaseOrderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder?: PurchaseOrderResponse | null;
  onSubmit: (data: CreatePurchaseOrderDto) => Promise<void>;
};

export function PurchaseOrderDialog({
  open,
  onOpenChange,
  purchaseOrder,
  onSubmit,
}: PurchaseOrderDialogProps) {
  const form = usePurchaseOrderForm({
    purchaseOrder: purchaseOrder ?? null,
    onSubmit,
    onClose: () => onOpenChange(false),
    open,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.title}</DialogTitle>
          <DialogDescription>{form.description}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit}
          className="space-y-8"
        >
          <BasicInfoSection
            title={SECTION_TITLES.basicInfo}
            subject={form.subject}
            onSubjectChange={form.setSubject}
            paymentTerms={form.paymentTerms}
            onPaymentTermsChange={form.setPaymentTerms}
            deliveryOpen={form.deliveryOpen}
            onDeliveryOpenChange={form.setDeliveryOpen}
            deliveryLabel={form.deliveryLabel}
            selectedDeliveryDate={form.selectedDeliveryDate}
            onDeliverySelect={form.handleDeliverySelect}
            currencyId={form.resolvedCurrencyId}
            onCurrencyChange={form.handleCurrencyChange}
            currencies={form.currencies}
          />

          <VendorShippingSection
            title={SECTION_TITLES.vendorShipping}
            vendorId={form.vendorId}
            onVendorChange={form.handleVendorChange}
            vendorSearch={form.vendorSearch}
            onVendorSearchChange={form.setVendorSearch}
            vendors={form.vendors}
            stockLocationId={form.stockLocationId}
            onStockLocationChange={form.handleStockLocationChange}
            stockLocationSearch={form.stockLocationSearch}
            onStockLocationSearchChange={form.setStockLocationSearch}
            stockLocations={form.stockLocations}
            paymentMethodId={form.paymentMethodId}
            onPaymentMethodChange={form.handlePaymentMethodChange}
            paymentMethodSearch={form.paymentMethodSearch}
            onPaymentMethodSearchChange={form.setPaymentMethodSearch}
            paymentMethods={form.paymentMethods}
            inboundShippingMethodId={form.inboundShippingMethodId}
            onInboundShippingMethodChange={form.handleInboundShippingMethodChange}
            inboundShippingSearch={form.inboundShippingSearch}
            onInboundShippingSearchChange={form.setInboundShippingSearch}
            inboundShippingMethods={form.inboundShippingMethods}
            shippingCost={form.shippingCost}
            onShippingCostChange={form.setShippingCost}
          />

          <PricingDiscountSection
            title={SECTION_TITLES.pricingDiscount}
            discountType={form.discountType}
            discountValue={form.discountValue}
            onDiscountTypeChange={form.setDiscountType}
            onDiscountValueChange={form.setDiscountValue}
          />

          <NotesSection
            title={SECTION_TITLES.notes}
            note={form.note}
            onNoteChange={form.setNote}
          />

          <LineItemsSection
            title={SECTION_TITLES.lineItems}
            lines={form.lines}
            onAddLine={form.handleAddLine}
            onRemoveLine={form.handleRemoveLine}
            onUpdateLine={form.updateLine}
            onLineVariantChange={form.handleLineVariantChange}
            onLineTaxChange={form.handleLineTaxChange}
            variantItems={form.variantItems}
            taxes={form.taxes}
            variantSearch={form.variantSearch}
            onVariantSearchChange={form.setVariantSearch}
            taxSearch={form.taxSearch}
            onTaxSearchChange={form.setTaxSearch}
          />

          <SummarySection
            title={SECTION_TITLES.summary}
            summary={form.summary}
            decimals={form.decimals}
            currencyPosition={form.currencyPosition}
            selectedCurrency={form.selectedCurrency}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={form.isEdit && !form.isDirty}
            >
              {form.isEdit ? 'Update Purchase Order' : 'Create Purchase Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
