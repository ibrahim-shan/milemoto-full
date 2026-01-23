import {
  CreateUnitGroupDto,
  PaginatedUnitGroupResponse,
  UnitGroupResponse,
  UpdateUnitGroupDto,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';

// ==== Query Keys & API Paths ====================================

const API_BASE = '/admin/units';

export const unitKeys = {
  all: ['units'] as const,
  lists: () => [...unitKeys.all, 'list'] as const,
  list: (params: unknown) => [...unitKeys.lists(), params] as const,
  details: () => [...unitKeys.all, 'detail'] as const,
  detail: (id: number) => [...unitKeys.details(), id] as const,
};

type UnitListParams = {
  search: string;
  page: number;
  limit: number;
  status?: 'active' | 'inactive';
};

// ==== Fetch Functions ===========================================

const listUnitGroups = async (params: UnitListParams) => {
  const query = new URLSearchParams({
    search: params.search,
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.status) {
    query.set('status', params.status);
  }
  const data = await authorizedGet<PaginatedUnitGroupResponse>(`${API_BASE}?${query.toString()}`);
  return data;
};

const getUnitGroup = async (id: number) => {
  const data = await authorizedGet<UnitGroupResponse>(`${API_BASE}/${id}`);
  return data;
};

const createUnitGroup = (data: CreateUnitGroupDto) =>
  authorizedPost<UnitGroupResponse>(`${API_BASE}`, data);

const updateUnitGroup = ({ id, ...data }: UpdateUnitGroupDto & { id: number }) =>
  authorizedPut<UnitGroupResponse>(`${API_BASE}/${id}`, data);

const deleteUnitGroup = (id: number) => authorizedDel<void>(`${API_BASE}/${id}`);

// ==== Hooks =====================================================

export const useGetUnitGroups = (params: UnitListParams) =>
  useQuery({
    queryKey: unitKeys.list(params),
    queryFn: () => listUnitGroups(params),
    placeholderData: previousData => previousData,
  });

export const useGetUnitGroup = (id: number, enabled = true) =>
  useQuery({
    queryKey: unitKeys.detail(id),
    queryFn: () => getUnitGroup(id),
    enabled: !!id && enabled,
  });

export const useCreateUnitGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateUnitGroupDto) => {
      const promise = createUnitGroup(data);
      toast.promise(promise, {
        loading: 'Creating unit group...',
        success: 'Unit group created successfully.',
        error: (err: Error) => err.message || 'Failed to create unit group.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitKeys.lists() });
    },
  });
};

export const useUpdateUnitGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateUnitGroupDto & { id: number }) => {
      const promise = updateUnitGroup(data);
      toast.promise(promise, {
        loading: 'Updating unit group...',
        success: 'Unit group updated successfully.',
        error: (err: Error) => err.message || 'Failed to update unit group.',
      });
      return await promise;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: unitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: unitKeys.detail(data.id) });
    },
  });
};

export const useDeleteUnitGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const promise = deleteUnitGroup(id);
      toast.promise(promise, {
        loading: 'Deleting unit group...',
        success: 'Unit group deleted.',
        error: (err: Error) => err.message || 'Failed to delete unit group.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
};

export type UnitGroup = UnitGroupResponse;
