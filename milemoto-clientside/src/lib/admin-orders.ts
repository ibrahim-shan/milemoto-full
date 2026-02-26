import { authorizedGet } from './api';
import { buildUrlWithQuery } from './queryString';

import type {
  AdminOrderDetailResponse,
  AdminOrdersListQueryDto,
  AdminOrdersListResponse,
} from '@/types';

export function fetchAdminOrders(
  params: Partial<AdminOrdersListQueryDto>,
): Promise<AdminOrdersListResponse> {
  const url = buildUrlWithQuery(
    '/admin/orders',
    params as Record<string, string | number | boolean | null | undefined>,
  );
  return authorizedGet<AdminOrdersListResponse>(url);
}

export function fetchAdminOrderById(id: number): Promise<AdminOrderDetailResponse> {
  return authorizedGet<AdminOrderDetailResponse>(`/admin/orders/${id}`);
}
