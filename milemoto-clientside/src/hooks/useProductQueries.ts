import {
  CreateProductDto,
  PaginatedProductResponse,
  PaginatedResponse,
  ProductListQueryDto,
  ProductResponse,
  ProductVariantResponse,
  UpdateProductDto,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';
import { buildUrlWithQuery } from '@/lib/queryString';

const QUERY_KEY = 'products';

// Special type for the flattened variant list endpoint
export interface ProductVariantItemResponse {
  id: number;
  sku: string;
  barcode: string | null;
  price: number;
  productName: string;
  variantName: string;
  imagePath?: string;
}

type QueryOptions = {
  enabled?: boolean;
};

export function useGetProducts(params?: ProductListQueryDto) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const url = buildUrlWithQuery('/admin/products', params ?? {});
      const data = await authorizedGet<PaginatedProductResponse>(url);
      return data;
    },
  });
}

export function useGetAllProductVariants(
  params?: {
    page?: number;
    limit?: number;
    search?: string;
  },
  options?: QueryOptions,
) {
  return useQuery({
    queryKey: ['product-variants', params],
    queryFn: async () => {
      const url = buildUrlWithQuery('/admin/products/variants', params ?? {});
      const data = await authorizedGet<PaginatedResponse<ProductVariantItemResponse>>(url);
      return data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useGetProduct(id: number | null) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const product = await authorizedGet<ProductResponse>(`/admin/products/${id}`);
      return product;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation<ProductResponse, Error, CreateProductDto>({
    mutationFn: async (data: CreateProductDto) => {
      const result = await authorizedPost<ProductResponse>('/admin/products', data);
      return result;
    },
    onSuccess: () => {
      toast.success('Product created successfully');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create product');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation<ProductResponse, Error, { id: number; data: UpdateProductDto }>({
    mutationFn: async ({ id, data }) => {
      const result = await authorizedPut<ProductResponse>(`/admin/products/${id}`, data);
      return result;
    },
    onSuccess: data => {
      toast.success('Product updated successfully');
      queryClient.setQueryData([QUERY_KEY, data.id], data);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update product');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  type DeleteResponse = { success: boolean; action?: 'deleted' | 'deactivated'; message?: string };

  return useMutation<DeleteResponse, Error, number>({
    mutationFn: async (id: number) => {
      const promise = authorizedDel<DeleteResponse>(`/admin/products/${id}`);
      toast.promise(promise, {
        loading: 'Deleting product...',
        success: (res?: DeleteResponse) =>
          res?.action === 'deactivated'
            ? (res?.message ??
              'Product is linked to stock or receipts and was marked inactive instead of deleted.')
            : 'Product deleted successfully.',
        error: (error: Error) => error.message || 'Failed to delete product.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// Re-export camel-cased product type
export type Product = ProductResponse;
export type ProductVariant = ProductVariantResponse;
export type ProductVariantItem = ProductVariantItemResponse;
