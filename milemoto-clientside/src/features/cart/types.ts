export type CartItem = {
  id: string;
  slug: string;
  title: string;
  variantName?: string;
  imageSrc: string;
  priceMinor: number;
  qty: number;
  stock?: number;
  warning?: string;
  /** Unix ms when the item was added — used to detect stale guest prices. */
  addedAt?: number;
  productVariantId?: number | undefined;
};

export type AddCartItemInput = {
  slug: string;
  title: string;
  variantName?: string;
  imageSrc: string;
  priceMinor: number;
  qty?: number;
  stock?: number;
  productVariantId?: number | undefined;
};
