import {
  CreateWarrantyDto,
  PaginatedWarrantyResponse,
  UpdateWarrantyDto,
  WarrantyResponse,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';
import { buildUrlWithQuery } from '@/lib/queryString';

export type WarrantyListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
};

// Keys
export const warrantyKeys = {
  all: ['warranties'] as const,
  lists: () => [...warrantyKeys.all, 'list'] as const,
  list: (filters: WarrantyListQuery) => [...warrantyKeys.lists(), filters] as const,
  details: () => [...warrantyKeys.all, 'detail'] as const,
  detail: (id: number) => [...warrantyKeys.details(), id] as const,
};

// Hooks
export function useGetWarranties(params: WarrantyListQuery) {
  return useQuery({
    queryKey: warrantyKeys.list(params),
    queryFn: async () => {
      const url = buildUrlWithQuery('/admin/warranties', params);
      const data = await authorizedGet<PaginatedWarrantyResponse>(url);
      return data;
    },
  });
}

export function useCreateWarranty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWarrantyDto) => {
      const result = await authorizedPost<WarrantyResponse>('/admin/warranties', data);
      return result;
    },
    onSuccess: () => {
      toast.success('Warranty created successfully');
      queryClient.invalidateQueries({ queryKey: warrantyKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create warranty');
      console.error(error);
    },
  });
}

export function useUpdateWarranty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateWarrantyDto }) => {
      const result = await authorizedPut<WarrantyResponse>(`/admin/warranties/${id}`, data);
      return result;
    },
    onSuccess: data => {
      toast.success('Warranty updated successfully');
      queryClient.invalidateQueries({ queryKey: warrantyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warrantyKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update warranty');
      console.error(error);
    },
  });
}

export function useDeleteWarranty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await authorizedDel(`/admin/warranties/${id}`);
    },
    onSuccess: () => {
      toast.success('Warranty deleted successfully');
      queryClient.invalidateQueries({ queryKey: warrantyKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete warranty');
      console.error(error);
    },
  });
}

// Re-export types for convenience
export type Warranty = WarrantyResponse;
