import { CreateGrade, GradeResponse, PaginatedGradeResponse, UpdateGrade } from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';
import { buildUrlWithQuery } from '@/lib/queryString';

export type { CreateGrade, UpdateGrade };
export type Grade = GradeResponse;

export type GradeListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
};

// Keys
export const gradeKeys = {
  all: ['grades'] as const,
  lists: () => [...gradeKeys.all, 'list'] as const,
  list: (filters: GradeListQuery) => [...gradeKeys.lists(), filters] as const,
  details: () => [...gradeKeys.all, 'detail'] as const,
  detail: (id: number) => [...gradeKeys.details(), id] as const,
};

// Hooks

// Hooks

export function useGetGrades(params: GradeListQuery) {
  return useQuery({
    queryKey: gradeKeys.list(params),
    queryFn: async () => {
      const url = buildUrlWithQuery('/admin/grades', params);
      const data = await authorizedGet<PaginatedGradeResponse>(url);
      return data;
    },
  });
}

export function useCreateGrade() {
  const queryClient = useQueryClient();

  return useMutation<GradeResponse, Error, CreateGrade>({
    mutationFn: async (data: CreateGrade) => {
      const result = await authorizedPost<GradeResponse>('/admin/grades', data);
      return result;
    },
    onSuccess: () => {
      toast.success('Grade created successfully');
      queryClient.invalidateQueries({ queryKey: gradeKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create grade');
      console.error(error);
    },
  });
}

export function useUpdateGrade() {
  const queryClient = useQueryClient();

  return useMutation<GradeResponse, Error, { id: number; data: UpdateGrade }>({
    mutationFn: async ({ id, data }) => {
      const result = await authorizedPut<GradeResponse>(`/admin/grades/${id}`, data);
      return result;
    },
    onSuccess: data => {
      toast.success('Grade updated successfully');
      queryClient.invalidateQueries({ queryKey: gradeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gradeKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update grade');
      console.error(error);
    },
  });
}

export function useDeleteGrade() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id: number) => {
      await authorizedDel(`/admin/grades/${id}`);
    },
    onSuccess: () => {
      toast.success('Grade deleted successfully');
      queryClient.invalidateQueries({ queryKey: gradeKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete grade');
      console.error(error);
    },
  });
}
