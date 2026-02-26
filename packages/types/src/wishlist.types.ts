import { z } from "zod";

export const AddWishlistItemInput = z.object({
  productSlug: z.string().trim().min(1).max(255),
});
export type AddWishlistItemDto = z.infer<typeof AddWishlistItemInput>;

export const MergeWishlistInput = z.object({
  items: z.array(z.object({ productSlug: z.string().trim().min(1).max(255) })).max(200),
});
export type MergeWishlistDto = z.infer<typeof MergeWishlistInput>;

export interface WishlistItemResponse {
  id: number;
  productId: number;
  productSlug: string;
  productName: string;
  imageSrc: string | null;
  price: number;
  addedAt: string;
}

export interface WishlistResponse {
  items: WishlistItemResponse[];
  itemCount: number;
}

