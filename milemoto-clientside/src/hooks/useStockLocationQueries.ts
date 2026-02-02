import {
  CreateStockLocationDto,
  PaginatedStockLocationResponse,
  StockLocationListQueryDto,
  StockLocationResponse,
  UpdateStockLocationDto,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';
import { buildUrlWithQuery } from '@/lib/queryString';

type QueryOptions = {
  enabled?: boolean;
};

// Keys
export const stockLocationKeys = {
  all: ['stock-locations'] as const,
  lists: () => [...stockLocationKeys.all, 'list'] as const,
  list: (filters: StockLocationListQueryDto) => [...stockLocationKeys.lists(), filters] as const,
  details: () => [...stockLocationKeys.all, 'detail'] as const,
  detail: (id: number) => [...stockLocationKeys.details(), id] as const,
};

// Hooks
export function useGetStockLocations(params: StockLocationListQueryDto, options?: QueryOptions) {
  return useQuery({
    queryKey: stockLocationKeys.list(params),
    queryFn: async () => {
      const url = buildUrlWithQuery('/admin/stock-locations', params);
      const data = await authorizedGet<PaginatedStockLocationResponse>(url);
      return data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useCreateStockLocation() {
  const queryClient = useQueryClient();

  return useMutation<StockLocationResponse, Error, CreateStockLocationDto>({
    mutationFn: async (data: CreateStockLocationDto) => {
      const result = await authorizedPost<StockLocationResponse>('/admin/stock-locations', data);
      return result;
    },
    onSuccess: () => {
      toast.success('Stock location created successfully');
      queryClient.invalidateQueries({ queryKey: stockLocationKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create stock location');
      console.error(error);
    },
  });
}

export function useUpdateStockLocation() {
  const queryClient = useQueryClient();

  return useMutation<StockLocationResponse, Error, { id: number; data: UpdateStockLocationDto }>({
    mutationFn: async ({ id, data }) => {
      const result = await authorizedPut<StockLocationResponse>(
        `/admin/stock-locations/${id}`,
        data,
      );
      return result;
    },
    onSuccess: data => {
      toast.success('Stock location updated successfully');
      queryClient.invalidateQueries({ queryKey: stockLocationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: stockLocationKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update stock location');
      console.error(error);
    },
  });
}

export function useDeleteStockLocation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id: number) => {
      await authorizedDel(`/admin/stock-locations/${id}`);
    },
    onSuccess: () => {
      toast.success('Stock location deleted successfully');
      queryClient.invalidateQueries({ queryKey: stockLocationKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete stock location');
      console.error(error);
    },
  });
}

// Re-export types for convenience
export type StockLocation = StockLocationResponse;
