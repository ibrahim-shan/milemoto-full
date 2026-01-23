import { CreateTaxDto, PaginatedTaxResponse, TaxResponse, UpdateTaxDto } from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';

// ==== Query Keys & API Paths ====================================

const API_BASE = '/admin/taxes';

export const taxKeys = {
  all: ['taxes'] as const,
  lists: () => [...taxKeys.all, 'list'] as const,
  list: (params: unknown) => [...taxKeys.lists(), params] as const,
};

type TaxListParams = {
  search: string;
  page: number;
  limit: number;
  status?: 'active' | 'inactive';
};

type QueryOptions = {
  enabled?: boolean;
};

// ==== Fetch Functions ===========================================

const listTaxes = async (params: TaxListParams) => {
  const query = new URLSearchParams({
    search: params.search,
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.status) {
    query.set('status', params.status);
  }
  const data = await authorizedGet<PaginatedTaxResponse>(`${API_BASE}?${query.toString()}`);
  return data;
};

const createTax = (data: CreateTaxDto) => authorizedPost<TaxResponse>(`${API_BASE}`, data);

const updateTax = ({ id, ...data }: UpdateTaxDto & { id: number }) =>
  authorizedPut<TaxResponse>(`${API_BASE}/${id}`, data);

const deleteTax = (id: number) => authorizedDel<void>(`${API_BASE}/${id}`);

// ==== Hooks =====================================================

export const useGetTaxes = (params: TaxListParams, options?: QueryOptions) =>
  useQuery({
    queryKey: taxKeys.list(params),
    queryFn: () => listTaxes(params),
    placeholderData: previousData => previousData,
    enabled: options?.enabled ?? true,
  });

export const useCreateTax = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTaxDto) => {
      const promise = createTax(data);
      toast.promise(promise, {
        loading: 'Creating tax...',
        success: 'Tax created successfully.',
        error: (err: Error & { code?: string; message?: string }) =>
          err.code === 'DuplicateTax'
            ? 'Tax entry already exists.'
            : err.message || 'Failed to create tax.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxKeys.lists() });
    },
  });
};

export const useUpdateTax = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateTaxDto & { id: number }) => {
      const promise = updateTax(data);
      toast.promise(promise, {
        loading: 'Updating tax...',
        success: 'Tax updated successfully.',
        error: (err: Error & { code?: string; message?: string }) =>
          err.code === 'DuplicateTax'
            ? 'Tax entry already exists.'
            : err.message || 'Failed to update tax.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxKeys.lists() });
    },
  });
};

export const useDeleteTax = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const promise = deleteTax(id);
      toast.promise(promise, {
        loading: 'Deleting tax...',
        success: 'Tax deleted.',
        error: 'Failed to delete tax.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxKeys.lists() });
    },
  });
};

// Alias for consumers
export type Tax = TaxResponse;
