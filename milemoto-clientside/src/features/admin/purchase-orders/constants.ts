export const SECTION_TITLES = {
  basicInfo: 'Basic Information',
  vendorShipping: 'Vendor & Shipping',
  pricingDiscount: 'Pricing & Discount',
  notes: 'Notes',
  lineItems: 'Line Items',
  summary: 'Summary',
} as const;

export const SEARCH_DEBOUNCE_MS = 300;
export const LOOKUP_LIMIT = 100;

export const DISCOUNT_OPTIONS = [
  { value: 'none', label: 'No discount' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'percentage', label: 'Percentage' },
] as const;

export type PurchaseOrderColumn = {
  id: string;
  label: string;
  alwaysVisible?: boolean;
};

export const PURCHASE_ORDER_COLUMNS: PurchaseOrderColumn[] = [
  { id: 'poNumber', label: 'PO #' },
  { id: 'subject', label: 'Subject' },
  { id: 'status', label: 'Status' },
  { id: 'total', label: 'Total' },
  { id: 'createdAt', label: 'Created At' },
  { id: 'actions', label: 'Actions', alwaysVisible: true },
];
