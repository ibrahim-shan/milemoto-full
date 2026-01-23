import { useQuery } from '@tanstack/react-query';

import { authorizedGet } from '@/lib/api';

export function useMyPermissions() {
  return useQuery({
    queryKey: ['my-permissions'],
    queryFn: async () => {
      const res = await authorizedGet<{ permissions: string[] }>('/auth/permissions');
      return res.permissions;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

export function useCan(permission: string) {
  const { data: permissions } = useMyPermissions();
  if (!permissions) return false;
  return permissions.includes(permission);
}
