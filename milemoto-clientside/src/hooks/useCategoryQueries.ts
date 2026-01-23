import {
  CategoryDropdownItemResponse,
  CategoryResponse,
  CategoryTreeNodeResponse,
  CreateCategoryDto,
  PaginatedCategoryResponse,
  UpdateCategoryDto,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';

export type CategoryListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  parentId?: number;
};

// Keys
export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters: CategoryListQuery) => [...categoryKeys.lists(), filters] as const,
  tree: () => [...categoryKeys.all, 'tree'] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: number) => [...categoryKeys.details(), id] as const,
};

// Hooks
export function useGetCategories(params: CategoryListQuery) {
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.status) searchParams.append('status', params.status);
      if (params.parentId) searchParams.append('parentId', params.parentId.toString());

      const queryString = searchParams.toString();
      const url = `/admin/categories${queryString ? `?${queryString}` : ''}`;

      const data = await authorizedGet<PaginatedCategoryResponse>(url);
      return data;
    },
  });
}

export function useGetCategoryTree() {
  return useQuery({
    queryKey: categoryKeys.tree(),
    queryFn: async () => {
      const data = await authorizedGet<CategoryTreeNodeResponse[]>('/admin/categories/tree');
      return data;
    },
  });
}

export function useGetAllCategories(includeInactive = false, onlyRoots = false) {
  return useQuery({
    queryKey: [...categoryKeys.all, 'all', { includeInactive, onlyRoots }],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (includeInactive) searchParams.append('includeInactive', 'true');
      if (onlyRoots) searchParams.append('onlyRoots', 'true');

      const queryString = searchParams.toString();
      const url = `/admin/categories/all${queryString ? `?${queryString}` : ''}`;

      // Assuming API returns { items: [...] } structure for this specific endpoint
      const data = await authorizedGet<{ items: CategoryDropdownItemResponse[] }>(url);
      return data;
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation<CategoryResponse, Error, CreateCategoryDto>({
    mutationFn: async (data: CreateCategoryDto) => {
      const result = await authorizedPost<CategoryResponse>('/admin/categories', data);
      return result;
    },
    onSuccess: () => {
      toast.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.tree() });
      queryClient.invalidateQueries({ queryKey: [...categoryKeys.all, 'all'], exact: false });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create category');
      console.error(error);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation<CategoryResponse, Error, { id: number; data: UpdateCategoryDto }>({
    mutationFn: async ({ id, data }) => {
      const result = await authorizedPut<CategoryResponse>(`/admin/categories/${id}`, data);
      return result;
    },
    onSuccess: data => {
      toast.success('Category updated successfully');
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.tree() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: [...categoryKeys.all, 'all'], exact: false });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update category');
      console.error(error);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id: number) => {
      await authorizedDel(`/admin/categories/${id}`);
    },
    onSuccess: () => {
      toast.success('Category deleted successfully');
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.tree() });
      queryClient.invalidateQueries({ queryKey: [...categoryKeys.all, 'all'], exact: false });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete category');
      console.error(error);
    },
  });
}

// Re-export alias for convenience
export type Category = CategoryResponse;
export type CategoryTreeNode = CategoryTreeNodeResponse;
export type CategoryDropdownItem = CategoryDropdownItemResponse;
