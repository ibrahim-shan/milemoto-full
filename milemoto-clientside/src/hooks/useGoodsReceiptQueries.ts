import { purchaseOrderKeys } from './usePurchaseOrderQueries';
import {
  CreateGoodsReceiptDto,
  GoodsReceiptResponse,
  PaginatedGoodsReceiptResponse,
  UpdateGoodsReceiptDto,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';

export type GoodsReceiptListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  purchaseOrderId?: number;
};

export const goodsReceiptKeys = {
  all: ['goodsReceipts'] as const,
  lists: () => [...goodsReceiptKeys.all, 'list'] as const,
  list: (filters: GoodsReceiptListQuery) => [...goodsReceiptKeys.lists(), filters] as const,
  details: () => [...goodsReceiptKeys.all, 'detail'] as const,
  detail: (id: number) => [...goodsReceiptKeys.details(), id] as const,
};

export function useGetGoodsReceipts(params: GoodsReceiptListQuery) {
  return useQuery({
    queryKey: goodsReceiptKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.purchaseOrderId)
        searchParams.append('purchaseOrderId', params.purchaseOrderId.toString());

      const queryString = searchParams.toString();
      const url = `/admin/goods-receipts${queryString ? `?${queryString}` : ''}`;

      const data = await authorizedGet<PaginatedGoodsReceiptResponse>(url);
      return data;
    },
  });
}

export function useGetGoodsReceipt(id: number | null) {
  return useQuery({
    queryKey: goodsReceiptKeys.detail(id || 0),
    queryFn: async () => {
      const data = await authorizedGet<GoodsReceiptResponse>(`/admin/goods-receipts/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateGoodsReceiptDto) => {
      const result = await authorizedPost<GoodsReceiptResponse>('/admin/goods-receipts', data);
      return result;
    },
    onSuccess: () => {
      toast.success('Goods receipt created (draft) successfully');
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create goods receipt');
      console.error(error);
    },
  });
}

export function useUpdateGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateGoodsReceiptDto }) => {
      const result = await authorizedPut<GoodsReceiptResponse>(`/admin/goods-receipts/${id}`, data);
      return result;
    },
    onSuccess: data => {
      toast.success('Goods receipt draft updated');
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update goods receipt');
      console.error(error);
    },
  });
}

export function usePostGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await authorizedPost<GoodsReceiptResponse>(
        `/admin/goods-receipts/${id}/post`,
        {},
      );
      return result;
    },
    onSuccess: data => {
      toast.success('Goods receipt posted to stock');
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(data.id) });
      // Refresh related purchase order so status/received quantities update in UI
      queryClient.invalidateQueries({
        queryKey: purchaseOrderKeys.detail(data.purchaseOrderId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to post goods receipt');
      console.error(error);
    },
  });
}

export type GoodsReceipt = GoodsReceiptResponse;
