import {
  CollectionResponse,
  CollectionRule,
  CreateCollection,
  PaginatedCollectionResponse,
  UpdateCollection,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';

export type CollectionListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  type?: 'manual' | 'automatic';
};

export const collectionKeys = {
  all: ['collections'] as const,
  lists: () => [...collectionKeys.all, 'list'] as const,
  list: (filters: CollectionListQuery) => [...collectionKeys.lists(), filters] as const,
  details: () => [...collectionKeys.all, 'detail'] as const,
  detail: (id: number) => [...collectionKeys.details(), id] as const,
};

export function useGetCollections(params: CollectionListQuery) {
  return useQuery({
    queryKey: collectionKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.status) searchParams.append('status', params.status);
      if (params.type) searchParams.append('type', params.type);

      const qs = searchParams.toString();
      const data = await authorizedGet<PaginatedCollectionResponse>(
        `/admin/collections${qs ? `?${qs}` : ''}`,
      );
      return data;
    },
  });
}

export function useGetCollection(id: number) {
  return useQuery({
    queryKey: collectionKeys.detail(id),
    queryFn: async () => {
      const data = await authorizedGet<CollectionResponse>(`/admin/collections/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCollection) => {
      const data = await authorizedPost<CollectionResponse>('/admin/collections', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Collection created successfully');
      queryClient.invalidateQueries({ queryKey: collectionKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create collection');
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateCollection }) => {
      const result = await authorizedPut<CollectionResponse>(`/admin/collections/${id}`, data);
      return result;
    },
    onSuccess: data => {
      toast.success('Collection updated successfully');
      queryClient.invalidateQueries({ queryKey: collectionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update collection');
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await authorizedDel(`/admin/collections/${id}`);
    },
    onSuccess: () => {
      toast.success('Collection deleted successfully');
      queryClient.invalidateQueries({ queryKey: collectionKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete collection');
    },
  });
}

type CollectionPreviewResult = {
  sampleCount: number;
  matchedCount: number;
  results: { productId: number; productName: string; matched: boolean }[];
};

export function usePreviewCollection() {
  return useMutation<
    CollectionPreviewResult,
    Error,
    { id: number; body: { rules?: CollectionRule[]; matchType?: 'all' | 'any'; limit?: number } }
  >({
    mutationFn: async ({ id, body }) => {
      return authorizedPost<CollectionPreviewResult>(`/admin/collections/${id}/preview`, body);
    },
  });
}

export type Collection = CollectionResponse;

type CollectionProductItem = {
  variantId: number;
  productName: string;
  variantName: string;
  sku: string;
  barcode: string | null;
};

export function useGetCollectionProducts(id: number | null) {
  return useQuery({
    queryKey: id
      ? [...collectionKeys.detail(id), 'products']
      : ['collections', 'products', 'disabled'],
    queryFn: async () => {
      const data = await authorizedGet<{
        collection: CollectionResponse;
        items: CollectionProductItem[];
      }>(`/admin/collections/${id}/products`);
      return data;
    },
    enabled: !!id,
  });
}

export function useAddProductsToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, variantIds }: { id: number; variantIds: number[] }) => {
      return authorizedPost(`/admin/collections/${id}/products`, { variantIds });
    },
    onSuccess: (_data, vars) => {
      toast.success('Products added');
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(vars.id) });
      queryClient.invalidateQueries({ queryKey: [...collectionKeys.detail(vars.id), 'products'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add products');
    },
  });
}

export function useRemoveProductFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, variantId }: { id: number; variantId: number }) => {
      return authorizedDel(`/admin/collections/${id}/products/${variantId}`);
    },
    onSuccess: (_data, vars) => {
      toast.success('Product removed');
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(vars.id) });
      queryClient.invalidateQueries({ queryKey: [...collectionKeys.detail(vars.id), 'products'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove product');
    },
  });
}
