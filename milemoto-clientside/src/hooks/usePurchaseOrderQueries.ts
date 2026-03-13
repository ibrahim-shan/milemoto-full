import type {
  CreatePurchaseOrderDto,
  PaginatedPurchaseOrderResponse,
  PurchaseOrderFilterOptionsResponse,
  PurchaseOrderResponse,
  UpdatePurchaseOrderDto,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';
import { buildUrlWithQuery } from '@/lib/queryString';

export type PurchaseOrderListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  filterMode?: 'all' | 'any';
  status?: string;
  vendorId?: number;
  paymentMethodId?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'poNumber' | 'subject' | 'status' | 'total' | 'createdAt';
  sortDir?: 'asc' | 'desc';
};

type PurchaseOrderListResponse = PaginatedPurchaseOrderResponse;
type PurchaseOrderEntity = PurchaseOrderResponse;

const mapPurchaseOrderResponse = (po: PurchaseOrderEntity): PurchaseOrderResponse => po;

export const purchaseOrderKeys = {
  all: ['purchaseOrders'] as const,
  lists: () => [...purchaseOrderKeys.all, 'list'] as const,
  list: (filters: PurchaseOrderListQuery) => [...purchaseOrderKeys.lists(), filters] as const,
  filterOptions: () => [...purchaseOrderKeys.all, 'filter-options'] as const,
  details: () => [...purchaseOrderKeys.all, 'detail'] as const,
  detail: (id: number) => [...purchaseOrderKeys.details(), id] as const,
};

export function useGetPurchaseOrders(params: PurchaseOrderListQuery) {
  return useQuery({
    queryKey: purchaseOrderKeys.list(params),
    queryFn: async () => {
      const url = buildUrlWithQuery('/admin/purchase-orders', params);
      const data = await authorizedGet<PurchaseOrderListResponse>(url);
      return {
        ...data,
        items: data.items.map(mapPurchaseOrderResponse),
      };
    },
  });
}

export function useGetPurchaseOrderFilterOptions() {
  return useQuery({
    queryKey: purchaseOrderKeys.filterOptions(),
    queryFn: async () => {
      return authorizedGet<PurchaseOrderFilterOptionsResponse>(
        '/admin/purchase-orders/filter-options',
      );
    },
  });
}

export function useGetPurchaseOrder(id: number | null) {
  return useQuery({
    queryKey: purchaseOrderKeys.detail(id || 0),
    queryFn: async () => {
      const po = await authorizedGet<PurchaseOrderResponse>(`/admin/purchase-orders/${id}`);
      return mapPurchaseOrderResponse(po);
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePurchaseOrderDto) => {
      const result = await authorizedPost<PurchaseOrderResponse>('/admin/purchase-orders', data);
      return mapPurchaseOrderResponse(result);
    },
    onSuccess: () => {
      toast.success('Purchase order created successfully');
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create purchase order');
      console.error(error);
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdatePurchaseOrderDto }) => {
      const result = await authorizedPut<PurchaseOrderResponse>(
        `/admin/purchase-orders/${id}`,
        data,
      );
      return mapPurchaseOrderResponse(result);
    },
    onSuccess: data => {
      toast.success('Purchase order updated successfully');
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update purchase order');
      console.error(error);
    },
  });
}

export function useSubmitPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await authorizedPost<PurchaseOrderResponse>(
        `/admin/purchase-orders/${id}/submit`,
        {},
      );
      return mapPurchaseOrderResponse(result);
    },
    onSuccess: data => {
      toast.success('Purchase order submitted for approval');
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit purchase order');
      console.error(error);
    },
  });
}

export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await authorizedPost<PurchaseOrderResponse>(
        `/admin/purchase-orders/${id}/approve`,
        {},
      );
      return mapPurchaseOrderResponse(result);
    },
    onSuccess: data => {
      toast.success('Purchase order approved');
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve purchase order');
      console.error(error);
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await authorizedPost<PurchaseOrderResponse>(
        `/admin/purchase-orders/${id}/cancel`,
        {},
      );
      return mapPurchaseOrderResponse(result);
    },
    onSuccess: data => {
      toast.success('Purchase order cancelled');
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel purchase order');
      console.error(error);
    },
  });
}

export function useRejectPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await authorizedPost<PurchaseOrderResponse>(
        `/admin/purchase-orders/${id}/reject`,
        {},
      );
      return mapPurchaseOrderResponse(result);
    },
    onSuccess: data => {
      toast.success('Purchase order rejected');
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject purchase order');
      console.error(error);
    },
  });
}

export function useClosePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await authorizedPost<PurchaseOrderResponse>(
        `/admin/purchase-orders/${id}/close`,
        {},
      );
      return mapPurchaseOrderResponse(result);
    },
    onSuccess: data => {
      toast.success('Purchase order closed manually');
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to close purchase order');
      console.error(error);
    },
  });
}

export type PurchaseOrder = PurchaseOrderResponse;
