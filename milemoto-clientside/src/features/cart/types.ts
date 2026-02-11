export type CartItem = {
  id: string;
  slug: string;
  title: string;
  imageSrc: string;
  priceMinor: number;
  qty: number;
  productVariantId?: number | undefined;
};

export type AddCartItemInput = {
  slug: string;
  title: string;
  imageSrc: string;
  priceMinor: number;
  qty?: number;
  productVariantId?: number | undefined;
};
