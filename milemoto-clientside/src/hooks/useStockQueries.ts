import type {
  CreateStockAdjustmentDto,
  CreateStockTransferDto,
  PaginatedStockLevelResponse,
  PaginatedStockMovementResponse,
  StockLevelResponse,
  StockMovementResponse,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedGet, authorizedPost } from '@/lib/api';
import { buildUrlWithQuery } from '@/lib/queryString';

export type StockLevelListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  productVariantId?: number;
  productId?: number;
  stockLocationId?: number;
};

export type StockMovementListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  productVariantId?: number;
  stockLocationId?: number;
  type?: StockMovementResponse['type'];
};

export const stockKeys = {
  all: ['stock'] as const,
  levels: () => [...stockKeys.all, 'levels'] as const,
  levelList: (params: StockLevelListQuery) => [...stockKeys.levels(), params] as const,
  movements: () => [...stockKeys.all, 'movements'] as const,
  movementList: (params: StockMovementListQuery) => [...stockKeys.movements(), params] as const,
};

type QueryOptions = {
  enabled?: boolean;
};

export function useGetStockLevels(params: StockLevelListQuery, options?: QueryOptions) {
  return useQuery({
    queryKey: stockKeys.levelList(params),
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const url = buildUrlWithQuery('/admin/stock', params);
      const data = await authorizedGet<PaginatedStockLevelResponse>(url);
      return data;
    },
  });
}

export function useGetStockMovements(params: StockMovementListQuery) {
  return useQuery({
    queryKey: stockKeys.movementList(params),
    queryFn: async () => {
      const url = buildUrlWithQuery('/admin/stock/movements', params);
      const data = await authorizedGet<PaginatedStockMovementResponse>(url);
      return data;
    },
  });
}

export type StockLevel = StockLevelResponse;
export type StockMovement = StockMovementResponse;

export function useCreateStockAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStockAdjustmentDto) => {
      const result = await authorizedPost<StockMovementResponse>('/admin/stock/adjustments', data);
      return result;
    },
    onSuccess: () => {
      toast.success('Stock adjusted successfully');
      queryClient.invalidateQueries({ queryKey: stockKeys.levels() });
      queryClient.invalidateQueries({ queryKey: stockKeys.movements() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to adjust stock');
      console.error(error);
    },
  });
}

export function useCreateStockTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStockTransferDto) => {
      const result = await authorizedPost<StockMovementResponse>('/admin/stock/transfers', data);
      return result;
    },
    onSuccess: () => {
      toast.success('Stock transferred successfully');
      queryClient.invalidateQueries({ queryKey: stockKeys.levels() });
      queryClient.invalidateQueries({ queryKey: stockKeys.movements() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to transfer stock');
      console.error(error);
    },
  });
}
