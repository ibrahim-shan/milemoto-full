import {
  CreateCurrencyDto,
  CurrencyResponse,
  PaginatedCurrencyResponse,
  UpdateCurrencyDto,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';
import { buildUrlWithQuery } from '@/lib/queryString';

// ==== Query Keys & API Paths ====================================

const API_BASE = '/admin/currencies';

export const currencyKeys = {
  all: ['currencies'] as const,
  lists: () => [...currencyKeys.all, 'list'] as const,
  list: (params: unknown) => [...currencyKeys.lists(), params] as const,
};

type CurrencyListParams = {
  search: string;
  page: number;
  limit: number;
  status?: 'active' | 'inactive' | undefined;
};

type QueryOptions = {
  enabled?: boolean;
};

// ==== Fetch Functions ===========================================

const listCurrencies = async (params: CurrencyListParams) => {
  const url = buildUrlWithQuery(API_BASE, params);
  const data = await authorizedGet<PaginatedCurrencyResponse>(url);
  return data;
};

const createCurrency = (data: CreateCurrencyDto) =>
  authorizedPost<CurrencyResponse>(`${API_BASE}`, data);

const updateCurrency = ({ id, ...data }: UpdateCurrencyDto & { id: number }) =>
  authorizedPut<CurrencyResponse>(`${API_BASE}/${id}`, data);

type DeleteResponse = { success: boolean; action?: 'deleted' | 'deactivated'; message?: string };

const deleteCurrency = (id: number) => authorizedDel<DeleteResponse>(`${API_BASE}/${id}`);

// ==== Hooks =====================================================

export const useGetCurrencies = (params: CurrencyListParams) =>
  useQuery({
    queryKey: currencyKeys.list(params),
    queryFn: () => listCurrencies(params),
    placeholderData: previousData => previousData,
  });

export const useCreateCurrency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCurrencyDto) => {
      const promise = createCurrency(data);
      toast.promise(promise, {
        loading: 'Creating currency...',
        success: 'Currency created successfully.',
        error: (err: Error & { code?: string; message?: string }) =>
          err.code === 'DuplicateCurrency'
            ? 'Currency code already exists.'
            : err.message || 'Failed to create currency.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: currencyKeys.all });
    },
  });
};

export const useUpdateCurrency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateCurrencyDto & { id: number }) => {
      const promise = updateCurrency(data);
      toast.promise(promise, {
        loading: 'Updating currency...',
        success: 'Currency updated successfully.',
        error: (err: Error & { code?: string; message?: string }) =>
          err.code === 'DuplicateCurrency'
            ? 'Currency code already exists.'
            : err.message || 'Failed to update currency.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: currencyKeys.all });
    },
  });
};

export const useDeleteCurrency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const promise = deleteCurrency(id);
      toast.promise(promise, {
        loading: 'Deleting currency...',
        success: (res?: DeleteResponse) =>
          res?.action === 'deactivated'
            ? (res?.message ??
              'Currency is linked to purchase orders and was marked inactive instead of deleted.')
            : 'Currency deleted.',
        error: (err: Error) => err.message || 'Failed to delete currency.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: currencyKeys.all });
    },
  });
};

export const useGetActiveCurrencies = (options?: QueryOptions) =>
  useQuery({
    queryKey: [...currencyKeys.all, 'active'] as const,
    queryFn: () => listCurrencies({ search: '', page: 1, limit: 100, status: 'active' }), // Fetch active currencies
    select: data => data.items, // Already filtered via status
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled ?? true,
  });

// Re-export alias for convenience
export type Currency = CurrencyResponse;
