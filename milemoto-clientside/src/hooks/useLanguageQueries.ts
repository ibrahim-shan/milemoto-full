import {
  CreateLanguageDto,
  LanguageResponse,
  PaginatedLanguageResponse,
  UpdateLanguageDto,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';
import { buildUrlWithQuery } from '@/lib/queryString';

// ==== Query Keys & API Paths ====================================

// Matches the backend route mounting path
const API_BASE = '/admin/languages';

export const languageKeys = {
  all: ['languages'] as const,
  lists: () => [...languageKeys.all, 'list'] as const,
  list: (params: unknown) => [...languageKeys.lists(), params] as const,
};

type LanguageListParams = {
  search?: string;
  page?: number;
  limit?: number;
};

// ==== Fetch Functions ===========================================

const listLanguages = async (params: LanguageListParams = {}) => {
  const url = buildUrlWithQuery(API_BASE, params);
  const data = await authorizedGet<PaginatedLanguageResponse>(url);
  return data;
};

const createLanguage = (data: CreateLanguageDto) =>
  authorizedPost<LanguageResponse>(`${API_BASE}`, data);

const updateLanguage = ({ id, ...data }: UpdateLanguageDto & { id: number }) =>
  authorizedPut<LanguageResponse>(`${API_BASE}/${id}`, data);

const deleteLanguage = (id: number) => authorizedDel<void>(`${API_BASE}/${id}`);

// ==== Hooks =====================================================

export const useGetLanguages = (params: LanguageListParams = {}) =>
  useQuery({
    queryKey: languageKeys.list(params),
    queryFn: () => listLanguages(params),
    placeholderData: previousData => previousData,
  });

// Hook specifically for fetching active languages for dropdowns
export const useGetActiveLanguages = () =>
  useQuery({
    queryKey: [...languageKeys.all, 'active'] as const,
    queryFn: () => listLanguages({ limit: 100 }), // Fetch all languages
    select: data => data.items.filter(lang => lang.status === 'active'), // Filter to active only
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export const useCreateLanguage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateLanguageDto) => {
      const promise = createLanguage(data);
      toast.promise(promise, {
        loading: 'Adding language...',
        success: 'Language added successfully.',
        error: (err: Error & { code?: string; message?: string }) =>
          err.code === 'DuplicateLanguage'
            ? 'A language with this code already exists.'
            : err.message || 'Failed to add language.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: languageKeys.lists() });
    },
  });
};

export const useUpdateLanguage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateLanguageDto & { id: number }) => {
      const promise = updateLanguage(data);
      toast.promise(promise, {
        loading: 'Updating language...',
        success: 'Language updated successfully.',
        error: (err: Error & { code?: string; message?: string }) =>
          err.code === 'DuplicateLanguage'
            ? 'A language with this code already exists.'
            : err.message || 'Failed to update language.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: languageKeys.lists() });
    },
  });
};

export const useDeleteLanguage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const promise = deleteLanguage(id);
      toast.promise(promise, {
        loading: 'Deleting language...',
        success: 'Language deleted.',
        error: 'Failed to delete language.',
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: languageKeys.lists() });
    },
  });
};

export type Language = LanguageResponse;
