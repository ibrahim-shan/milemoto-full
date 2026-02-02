import {
  CreateAreaRateDto,
  PaginatedAreaRateResponse,
  ShippingAreaRateResponse,
  ShippingMethodResponse,
  UpdateAreaRateDto,
  UpdateShippingMethodDto,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';
import { buildUrlWithQuery } from '@/lib/queryString';

export type ShippingMethod = ShippingMethodResponse;
export type ShippingAreaRate = ShippingAreaRateResponse;

// ==== Query Keys & API Paths ====================================

const API_BASE = '/admin/shipping';

export const shippingKeys = {
  all: ['shipping'] as const,
  methods: () => [...shippingKeys.all, 'methods'] as const,
  areaRates: () => [...shippingKeys.all, 'area-rates'] as const,
  areaRatesList: (params: unknown) => [...shippingKeys.areaRates(), 'list', params] as const,
};

type AreaRateListParams = {
  search: string;
  page: number;
  limit: number;
};

// ==== Fetch Functions ===========================================

// -- Methods --
const listShippingMethods = async () => {
  const data = await authorizedGet<ShippingMethodResponse[]>(`${API_BASE}/methods`);
  return data;
};

const updateShippingMethod = ({ code, ...data }: UpdateShippingMethodDto & { code: string }) =>
  authorizedPut<ShippingMethodResponse>(`${API_BASE}/methods/${code}`, data);

// -- Area Rates --
const listAreaRates = async (params: AreaRateListParams) => {
  const url = buildUrlWithQuery(`${API_BASE}/area-rates`, params);
  const data = await authorizedGet<PaginatedAreaRateResponse>(url);
  return data;
};

const createAreaRate = (data: CreateAreaRateDto) =>
  authorizedPost<ShippingAreaRateResponse>(`${API_BASE}/area-rates`, data);

const updateAreaRate = ({ id, ...data }: UpdateAreaRateDto & { id: number }) =>
  authorizedPut<ShippingAreaRateResponse>(`${API_BASE}/area-rates/${id}`, data);

const deleteAreaRate = (id: number) => authorizedDel<void>(`${API_BASE}/area-rates/${id}`);

// ==== Hooks =====================================================

// -- Shipping Methods Hooks --

export const useGetShippingMethods = () =>
  useQuery({
    queryKey: shippingKeys.methods(),
    queryFn: listShippingMethods,
  });

export const useUpdateShippingMethod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateShippingMethodDto & { code: string }) => {
      const promise = updateShippingMethod(data);
      toast.promise(promise, {
        loading: 'Updating shipping method...',
        success: 'Shipping method updated.',
        error: 'Failed to update shipping method.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shippingKeys.methods() });
    },
  });
};

// -- Area Rates Hooks --

export const useGetAreaRates = (params: AreaRateListParams) =>
  useQuery({
    queryKey: shippingKeys.areaRatesList(params),
    queryFn: () => listAreaRates(params),
    placeholderData: previousData => previousData,
  });

export const useCreateAreaRate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAreaRateDto) => {
      const promise = createAreaRate(data);
      toast.promise(promise, {
        loading: 'Creating area rate...',
        success: 'Area rate created successfully.',
        error: (err: Error & { code?: string; message?: string }) =>
          err.code === 'DuplicateRate'
            ? 'A rate for this location already exists.'
            : err.message || 'Failed to create area rate.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shippingKeys.areaRates() });
    },
  });
};

export const useUpdateAreaRate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateAreaRateDto & { id: number }) => {
      const promise = updateAreaRate(data);
      toast.promise(promise, {
        loading: 'Updating rate...',
        success: 'Rate updated successfully.',
        error: 'Failed to update rate.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shippingKeys.areaRates() });
    },
  });
};

export const useDeleteAreaRate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const promise = deleteAreaRate(id);
      toast.promise(promise, {
        loading: 'Deleting rate...',
        success: 'Rate deleted.',
        error: 'Failed to delete rate.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shippingKeys.areaRates() });
    },
  });
};
