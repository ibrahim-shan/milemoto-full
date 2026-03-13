import {
  CreateVariant,
  PaginatedVariantResponse,
  UpdateVariant as UpdateVariantType,
  VariantResponse,
  VariantValueResponse,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';
import { buildUrlWithQuery } from '@/lib/queryString';

// Types
export type { CreateVariant };
export type UpdateVariant = UpdateVariantType;
export type Variant = VariantResponse;
export type VariantValue = VariantValueResponse;

type ListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  filterMode?: 'all' | 'any';
  status?: 'active' | 'inactive';
  sortBy?: 'name' | 'status' | 'createdAt' | 'updatedAt';
  sortDir?: 'asc' | 'desc';
};

// Query keys
const variantKeys = {
  all: ['variants'] as const,
  lists: () => [...variantKeys.all, 'list'] as const,
  list: (query: ListQuery) => [...variantKeys.lists(), query] as const,
  details: () => [...variantKeys.all, 'detail'] as const,
  detail: (id: number) => [...variantKeys.details(), id] as const,
};

// Get all variants
export function useGetVariants(query: ListQuery = {}) {
  return useQuery({
    queryKey: variantKeys.list(query),
    queryFn: async () => {
      const url = buildUrlWithQuery('/admin/variants', query);
      const data = await authorizedGet<PaginatedVariantResponse>(url);
      return data;
    },
  });
}

// Get single variant
export function useGetVariant(id: number) {
  return useQuery({
    queryKey: variantKeys.detail(id),
    queryFn: async () => {
      const data = await authorizedGet<VariantResponse>(`/admin/variants/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// Create variant
export function useCreateVariant() {
  const queryClient = useQueryClient();

  return useMutation<VariantResponse, Error, CreateVariant>({
    mutationFn: async (variant: CreateVariant) => {
      const data = await authorizedPost<VariantResponse>('/admin/variants', variant);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: variantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false });
      toast.success('Variant created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create variant');
    },
  });
}

// Update variant
export function useUpdateVariant() {
  const queryClient = useQueryClient();

  return useMutation<VariantResponse, Error, { id: number; data: UpdateVariantType }>({
    mutationFn: async payload => {
      const { id, data } = payload;
      const result = await authorizedPut<VariantResponse>(`/admin/variants/${id}`, data);
      return result;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: variantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: variantKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false });
      toast.success('Variant updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update variant');
    },
  });
}

// Delete variant
export function useDeleteVariant() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id: number) => {
      await authorizedDel(`/admin/variants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: variantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false });
      toast.success('Variant deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete variant');
    },
  });
}

// Add variant value
export function useAddVariantValue() {
  const queryClient = useQueryClient();

  return useMutation<
    VariantValueResponse,
    Error,
    {
      variantId: number;
      value: { value: string; slug: string; status?: 'active' | 'inactive' };
    }
  >({
    mutationFn: async ({ variantId, value }) => {
      const data = await authorizedPost<VariantValueResponse>(
        `/admin/variants/${variantId}/values`,
        value,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: variantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: variantKeys.detail(variables.variantId) });
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false });
      toast.success('Value added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add value');
    },
  });
}

// Update variant value
export function useUpdateVariantValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { value?: string; slug?: string; status?: 'active' | 'inactive' };
    }) => {
      const result = await authorizedPut<VariantValueResponse>(
        `/admin/variants/values/${id}`,
        data,
      );
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: variantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false });
      toast.success('Value updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update value');
    },
  });
}

// Delete variant value
export function useDeleteVariantValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await authorizedDel(`/admin/variants/values/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: variantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false });
      toast.success('Value deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete value');
    },
  });
}
