import type {
  CouponResponse,
  CreateCouponDto,
  PaginatedCouponResponse,
  UpdateCouponDto,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';
import { buildUrlWithQuery } from '@/lib/queryString';

export type CouponListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  type?: 'fixed' | 'percentage';
  dateFrom?: string;
  dateTo?: string;
  filterMode?: 'all' | 'any';
  sortBy?: 'code' | 'type' | 'value' | 'startsAt' | 'endsAt' | 'usedCount' | 'status' | 'createdAt';
  sortDir?: 'asc' | 'desc';
};

export const couponKeys = {
  all: ['coupons'] as const,
  lists: () => [...couponKeys.all, 'list'] as const,
  list: (filters: CouponListQuery) => [...couponKeys.lists(), filters] as const,
  details: () => [...couponKeys.all, 'detail'] as const,
  detail: (id: number) => [...couponKeys.details(), id] as const,
};

export function useGetCoupons(params: CouponListQuery) {
  return useQuery({
    queryKey: couponKeys.list(params),
    queryFn: async () => {
      const url = buildUrlWithQuery('/admin/coupons', params);
      return authorizedGet<PaginatedCouponResponse>(url);
    },
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCouponDto) =>
      authorizedPost<CouponResponse>('/admin/coupons', data),
    onSuccess: () => {
      toast.success('Coupon created successfully');
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create coupon');
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateCouponDto }) =>
      authorizedPut<CouponResponse>(`/admin/coupons/${id}`, data),
    onSuccess: data => {
      toast.success('Coupon updated successfully');
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
      queryClient.invalidateQueries({ queryKey: couponKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update coupon');
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => authorizedDel(`/admin/coupons/${id}`),
    onSuccess: () => {
      toast.success('Coupon deleted successfully');
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete coupon');
    },
  });
}

export type Coupon = CouponResponse;
