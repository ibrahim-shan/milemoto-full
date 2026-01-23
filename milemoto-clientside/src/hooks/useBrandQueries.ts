import {
  BrandResponse,
  CreateBrandDto,
  PaginatedBrandResponse,
  UpdateBrandDto as UpdateBrandDtoType,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';

export type BrandListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
};

// Keys
export const brandKeys = {
  all: ['brands'] as const,
  lists: () => [...brandKeys.all, 'list'] as const,
  list: (filters: BrandListQuery) => [...brandKeys.lists(), filters] as const,
  details: () => [...brandKeys.all, 'detail'] as const,
  detail: (id: number) => [...brandKeys.details(), id] as const,
};

// Hooks
export function useGetBrands(params: BrandListQuery) {
  return useQuery({
    queryKey: brandKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.status) searchParams.append('status', params.status);

      const queryString = searchParams.toString();
      const url = `/admin/brands${queryString ? `?${queryString}` : ''}`;

      const data = await authorizedGet<PaginatedBrandResponse>(url);
      return data;
    },
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();

  return useMutation<BrandResponse, Error, CreateBrandDto>({
    mutationFn: async (data: CreateBrandDto) => {
      const result = await authorizedPost<BrandResponse>('/admin/brands', data);
      return result;
    },
    onSuccess: () => {
      toast.success('Brand created successfully');
      queryClient.invalidateQueries({ queryKey: brandKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create brand');
      console.error(error);
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();

  return useMutation<BrandResponse, Error, { id: number; data: UpdateBrandDtoType }>({
    mutationFn: async payload => {
      const { id, data } = payload;
      const result = await authorizedPut<BrandResponse>(`/admin/brands/${id}`, data);
      return result;
    },
    onSuccess: data => {
      toast.success('Brand updated successfully');
      queryClient.invalidateQueries({ queryKey: brandKeys.lists() });
      queryClient.invalidateQueries({ queryKey: brandKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update brand');
      console.error(error);
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id: number) => {
      await authorizedDel(`/admin/brands/${id}`);
    },
    onSuccess: () => {
      toast.success('Brand deleted successfully');
      queryClient.invalidateQueries({ queryKey: brandKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete brand');
      console.error(error);
    },
  });
}

// Re-export type alias for convenience
export type Brand = BrandResponse;
