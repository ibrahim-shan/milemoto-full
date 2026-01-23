import {
  CreatePaymentMethodDto,
  PaginatedPaymentMethodResponse,
  PaymentMethodResponse,
  UpdatePaymentMethodDto,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';

export type PaymentMethodListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
};

type QueryOptions = {
  enabled?: boolean;
};

export const paymentMethodKeys = {
  all: ['paymentMethods'] as const,
  lists: () => [...paymentMethodKeys.all, 'list'] as const,
  list: (filters: PaymentMethodListQuery) => [...paymentMethodKeys.lists(), filters] as const,
  details: () => [...paymentMethodKeys.all, 'detail'] as const,
  detail: (id: number) => [...paymentMethodKeys.details(), id] as const,
};

export function useGetPaymentMethods(params: PaymentMethodListQuery, options?: QueryOptions) {
  return useQuery({
    queryKey: paymentMethodKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.status) searchParams.append('status', params.status);

      const queryString = searchParams.toString();
      const url = `/admin/payment-methods${queryString ? `?${queryString}` : ''}`;

      const data = await authorizedGet<PaginatedPaymentMethodResponse>(url);
      return data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaymentMethodDto) => {
      const result = await authorizedPost<PaymentMethodResponse>('/admin/payment-methods', data);
      return result;
    },
    onSuccess: () => {
      toast.success('Payment method created successfully');
      queryClient.invalidateQueries({ queryKey: paymentMethodKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create payment method');
      console.error(error);
    },
  });
}

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdatePaymentMethodDto }) => {
      const result = await authorizedPut<PaymentMethodResponse>(
        `/admin/payment-methods/${id}`,
        data,
      );
      return result;
    },
    onSuccess: data => {
      toast.success('Payment method updated successfully');
      queryClient.invalidateQueries({ queryKey: paymentMethodKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentMethodKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update payment method');
      console.error(error);
    },
  });
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await authorizedDel(`/admin/payment-methods/${id}`);
    },
    onSuccess: () => {
      toast.success('Payment method deleted successfully');
      queryClient.invalidateQueries({ queryKey: paymentMethodKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete payment method');
      console.error(error);
    },
  });
}

export type PaymentMethod = PaymentMethodResponse;
