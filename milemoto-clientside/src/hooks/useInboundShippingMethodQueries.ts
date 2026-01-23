import {
  CreateInboundShippingMethodDto,
  InboundShippingMethodResponse,
  PaginatedInboundShippingMethodResponse,
  UpdateInboundShippingMethodDto,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';

export type InboundShippingMethodListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
};

type QueryOptions = {
  enabled?: boolean;
};

export const inboundShippingMethodKeys = {
  all: ['inboundShippingMethods'] as const,
  lists: () => [...inboundShippingMethodKeys.all, 'list'] as const,
  list: (filters: InboundShippingMethodListQuery) =>
    [...inboundShippingMethodKeys.lists(), filters] as const,
  details: () => [...inboundShippingMethodKeys.all, 'detail'] as const,
  detail: (id: number) => [...inboundShippingMethodKeys.details(), id] as const,
};

export function useGetInboundShippingMethods(
  params: InboundShippingMethodListQuery,
  options?: QueryOptions,
) {
  return useQuery({
    queryKey: inboundShippingMethodKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.status) searchParams.append('status', params.status);

      const queryString = searchParams.toString();
      const url = `/admin/inbound-shipping-methods${queryString ? `?${queryString}` : ''}`;

      return authorizedGet<PaginatedInboundShippingMethodResponse>(url);
    },
    enabled: options?.enabled ?? true,
  });
}

export function useCreateInboundShippingMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInboundShippingMethodDto) => {
      return authorizedPost<InboundShippingMethodResponse>('/admin/inbound-shipping-methods', data);
    },
    onSuccess: () => {
      toast.success('Inbound shipping method created successfully');
      queryClient.invalidateQueries({ queryKey: inboundShippingMethodKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create inbound shipping method');
      console.error(error);
    },
  });
}

export function useUpdateInboundShippingMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateInboundShippingMethodDto }) => {
      return authorizedPut<InboundShippingMethodResponse>(
        `/admin/inbound-shipping-methods/${id}`,
        data,
      );
    },
    onSuccess: data => {
      toast.success('Inbound shipping method updated successfully');
      queryClient.invalidateQueries({ queryKey: inboundShippingMethodKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inboundShippingMethodKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update inbound shipping method');
      console.error(error);
    },
  });
}

export function useDeleteInboundShippingMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await authorizedDel(`/admin/inbound-shipping-methods/${id}`);
    },
    onSuccess: () => {
      toast.success('Inbound shipping method deleted successfully');
      queryClient.invalidateQueries({ queryKey: inboundShippingMethodKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete inbound shipping method');
      console.error(error);
    },
  });
}

export type InboundShippingMethod = InboundShippingMethodResponse;
