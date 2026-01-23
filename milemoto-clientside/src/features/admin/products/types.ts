import type { ProductVariant } from '@/hooks/useProductQueries';

export type ProductInventoryRow = {
  variant: ProductVariant;
  onHand: number;
  onOrder: number;
  currentQty: number;
};
