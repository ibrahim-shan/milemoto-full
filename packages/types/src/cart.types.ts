import { z } from "zod";

// ── Add-to-cart input ────────────────────────────────────────────────────────
export const AddToCartInput = z.object({
    productVariantId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(999).default(1),
});
export type AddToCartDto = z.infer<typeof AddToCartInput>;

// ── Update cart item quantity ────────────────────────────────────────────────
export const UpdateCartItemInput = z.object({
    quantity: z.number().int().min(0).max(999), // 0 = remove
});
export type UpdateCartItemDto = z.infer<typeof UpdateCartItemInput>;

// ── Merge guest cart (localStorage → server) ─────────────────────────────────
export const MergeCartInput = z.object({
    items: z
        .array(
            z.object({
                productVariantId: z.number().int().positive(),
                quantity: z.number().int().min(1).max(999),
            })
        )
        .max(50),
});
export type MergeCartDto = z.infer<typeof MergeCartInput>;

// ── Cart item response (enriched with product/variant data) ──────────────────
export interface CartItemResponse {
    id: number;
    productVariantId: number;
    quantity: number;
    addedAt: string;
    // Enriched from productvariants + products
    sku: string;
    variantName: string;
    price: number; // live price from DB
    productId: number;
    productName: string;
    productSlug: string;
    imageSrc: string | null;
    // Stock info
    available: number; // onHand - allocated
    // Warnings
    warning?: string;
}

// ── Full cart response ───────────────────────────────────────────────────────
export interface CartResponse {
    id: number;
    items: CartItemResponse[];
    itemCount: number;
    subtotal: number; // sum of (price × qty)
    warnings: string[];
}
