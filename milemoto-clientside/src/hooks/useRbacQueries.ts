import { CreateRoleDto, PermissionResponse, RoleResponse, UpdateRoleDto } from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedDel, authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';

export type { CreateRoleDto, UpdateRoleDto };
export type Role = RoleResponse;
export type Permission = PermissionResponse;

// Types
type GetRolesParams = {
  search?: string;
  page?: number;
  limit?: number;
};

// Keys
export const rbacKeys = {
  all: ['rbac'] as const,
  rolesBase: () => [...rbacKeys.all, 'roles'] as const,
  roles: (params?: GetRolesParams) => [...rbacKeys.all, 'roles', params] as const,
  role: (id: number) => [...rbacKeys.all, 'roles', id] as const,
  permissions: () => [...rbacKeys.all, 'permissions'] as const,
};

// Hooks
export function useGetRoles(params?: GetRolesParams) {
  return useQuery({
    queryKey: rbacKeys.roles(params),
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      // We are not implementing backend pagination for roles yet, but we accept the params to satisfy the UI.
      // Search IS implemented.

      return authorizedGet<RoleResponse[]>(`/admin/rbac/roles?${query.toString()}`);
    },
  });
}

export function useGetPermissions() {
  return useQuery({
    queryKey: rbacKeys.permissions(),
    queryFn: async () => {
      return authorizedGet<PermissionResponse[]>('/admin/rbac/permissions');
    },
  });
}

export function useGetRole(id: number) {
  return useQuery({
    queryKey: rbacKeys.role(id),
    queryFn: async () => {
      return authorizedGet<RoleResponse>(`/admin/rbac/roles/${id}`);
    },
    enabled: !!id,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRoleDto) => {
      return authorizedPost<RoleResponse>('/admin/rbac/roles', data);
    },
    onSuccess: () => {
      toast.success('Role created successfully');
      queryClient.invalidateQueries({ queryKey: rbacKeys.rolesBase() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create role');
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateRoleDto }) => {
      return authorizedPut<RoleResponse>(`/admin/rbac/roles/${id}`, data);
    },
    onSuccess: data => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: rbacKeys.rolesBase() });
      queryClient.invalidateQueries({ queryKey: rbacKeys.role(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update role');
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await authorizedDel(`/admin/rbac/roles/${id}`);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: rbacKeys.rolesBase() });

      const previous = queryClient.getQueriesData<RoleResponse[]>({
        queryKey: rbacKeys.rolesBase(),
      });

      for (const [key, data] of previous) {
        if (Array.isArray(data)) {
          queryClient.setQueryData<RoleResponse[]>(
            key,
            data.filter(r => r.id !== id),
          );
        }
      }

      return { previous };
    },
    onSuccess: () => {
      toast.success('Role deleted successfully');
      queryClient.invalidateQueries({ queryKey: rbacKeys.rolesBase() });
    },
    onError: (error: Error, _id, ctx) => {
      if (ctx?.previous) {
        for (const [key, data] of ctx.previous) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(error.message || 'Failed to delete role');
    },
  });
}
