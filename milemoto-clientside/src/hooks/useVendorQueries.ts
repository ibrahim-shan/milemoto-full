import {
  CreateVendorDto,
  PaginatedVendorResponse,
  UpdateVendorDto,
  VendorResponse,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';
import { buildUrlWithQuery } from '@/lib/queryString';

export type VendorListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  country?: string | string[];
  filterMode?: 'all' | 'any';
  sortBy?: 'name' | 'country' | 'status' | 'email' | 'createdAt' | 'updatedAt';
  sortDir?: 'asc' | 'desc';
};

type QueryOptions = {
  enabled?: boolean;
};

// Keys
export const vendorKeys = {
  all: ['vendors'] as const,
  lists: () => [...vendorKeys.all, 'list'] as const,
  list: (filters: VendorListQuery) => [...vendorKeys.lists(), filters] as const,
  details: () => [...vendorKeys.all, 'detail'] as const,
  detail: (id: number) => [...vendorKeys.details(), id] as const,
};

// Hooks
export function useGetVendors(params: VendorListQuery, options?: QueryOptions) {
  return useQuery({
    queryKey: vendorKeys.list(params),
    queryFn: async () => {
      const url = buildUrlWithQuery('/admin/vendors', params);
      const data = await authorizedGet<PaginatedVendorResponse>(url);
      return data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateVendorDto) => {
      const result = await authorizedPost<VendorResponse>('/admin/vendors', data);
      return result;
    },
    onSuccess: () => {
      toast.success('Vendor created successfully');
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create vendor');
      console.error(error);
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateVendorDto }) => {
      const result = await authorizedPut<VendorResponse>(`/admin/vendors/${id}`, data);
      return result;
    },
    onSuccess: data => {
      toast.success('Vendor updated successfully');
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update vendor');
      console.error(error);
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await authorizedDel(`/admin/vendors/${id}`);
    },
    onSuccess: () => {
      toast.success('Vendor deleted successfully');
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete vendor');
      console.error(error);
    },
  });
}

// Re-export types for convenience
export type Vendor = VendorResponse;
