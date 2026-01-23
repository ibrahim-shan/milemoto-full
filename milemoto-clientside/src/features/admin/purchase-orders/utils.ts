type VariantLike = {
  id: number;
  sku: string;
  productName?: string;
  variantName?: string;
  name?: string;
};

export function formatCurrency(amount: number | string | null | undefined): string {
  const val = Number(amount ?? 0);
  return val.toFixed(2);
}

export function getVariantLabel(variants: VariantLike[], id: number): string {
  const variant = variants.find(item => item.id === id);
  return variant
    ? `${variant.sku} - ${variant.productName || ''} ${
        variant.variantName ? `(${variant.variantName})` : ''
      }`
    : `#${id}`;
}
