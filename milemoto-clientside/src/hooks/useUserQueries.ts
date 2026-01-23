import { CreateUserDto, UpdateUserDto, UserResponse } from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';

// Keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: unknown) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
};

type GetUsersParams = {
  search?: string;
  page?: number;
  limit?: number;
};

// Hooks
export function useGetUsers(params?: GetUsersParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.page) query.append('page', String(params.page));
      if (params?.limit) query.append('limit', String(params.limit));

      // Note: Backend might not handle pagination yet, but we pass params
      return authorizedGet<UserResponse[]>(`/admin/users?${query.toString()}`);
    },
  });
}

export function useGetUser(id: number) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      return authorizedGet<UserResponse>(`/admin/users/${id}`);
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserDto) => {
      return authorizedPost<UserResponse>('/admin/users', data);
    },
    onSuccess: () => {
      toast.success('User created successfully');
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create user');
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateUserDto }) => {
      return authorizedPut<UserResponse>(`/admin/users/${id}`, data);
    },
    onSuccess: data => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user');
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await authorizedDel(`/admin/users/${id}`);
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });
}

export type User = UserResponse;
export type { CreateUserDto, UpdateUserDto };
