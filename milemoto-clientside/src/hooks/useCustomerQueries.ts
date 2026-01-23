import { CustomerResponse, PaginatedCustomerResponse, UpdateCustomerDto } from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedGet, authorizedPut } from '@/lib/api';

export type CustomerListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'blocked';
  ordersMin?: number;
  ordersMax?: number;
  spentMin?: number;
  spentMax?: number;
  dateStart?: string;
  dateEnd?: string;
};

// Keys
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: CustomerListQuery) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: number) => [...customerKeys.details(), id] as const,
};

// Hooks
export function useGetCustomers(params: CustomerListQuery) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.status) searchParams.append('status', params.status);
      if (params.ordersMin) searchParams.append('ordersMin', params.ordersMin.toString());
      if (params.ordersMax) searchParams.append('ordersMax', params.ordersMax.toString());
      if (params.spentMin) searchParams.append('spentMin', params.spentMin.toString());
      if (params.spentMax) searchParams.append('spentMax', params.spentMax.toString());
      if (params.dateStart) searchParams.append('dateStart', params.dateStart);
      if (params.dateEnd) searchParams.append('dateEnd', params.dateEnd);

      const queryString = searchParams.toString();
      const url = `/admin/customers${queryString ? `?${queryString}` : ''}`;

      const data = await authorizedGet<PaginatedCustomerResponse>(url);
      return data;
    },
  });
}

export function useGetCustomer(id: number) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: async () => {
      const data = await authorizedGet<CustomerResponse>(`/admin/customers/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateCustomerDto }) => {
      const result = await authorizedPut<CustomerResponse>(`/admin/customers/${id}`, data);
      return result;
    },
    onSuccess: data => {
      toast.success('Customer updated successfully');
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update customer');
      console.error(error);
    },
  });
}

// Re-export types for convenience
export type Customer = CustomerResponse;
