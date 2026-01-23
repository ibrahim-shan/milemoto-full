export type LineDraft = {
  id: string;
  productVariantId: number | null;
  orderedQty: number;
  unitCost: number;
  taxId: number | null;
};

export type PurchaseOrderSummary = {
  totalQty: number;
  subtotal: number;
  discountAmount: number;
  shipping: number;
  taxTotal: number;
  totalBeforeTax: number;
  totalAfterTax: number;
  totalBeforeTaxDiscountShipping: number;
  totalAfterTaxDiscountShipping: number;
};
