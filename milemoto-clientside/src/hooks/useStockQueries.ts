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
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.productVariantId)
        searchParams.append('productVariantId', params.productVariantId.toString());
      if (params.productId) searchParams.append('productId', params.productId.toString());
      if (params.stockLocationId)
        searchParams.append('stockLocationId', params.stockLocationId.toString());

      const queryString = searchParams.toString();
      const url = `/admin/stock${queryString ? `?${queryString}` : ''}`;

      const data = await authorizedGet<PaginatedStockLevelResponse>(url);
      return data;
    },
  });
}

export function useGetStockMovements(params: StockMovementListQuery) {
  return useQuery({
    queryKey: stockKeys.movementList(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.productVariantId)
        searchParams.append('productVariantId', params.productVariantId.toString());
      if (params.stockLocationId)
        searchParams.append('stockLocationId', params.stockLocationId.toString());
      if (params.type) searchParams.append('type', params.type);

      const queryString = searchParams.toString();
      const url = `/admin/stock/movements${queryString ? `?${queryString}` : ''}`;

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
