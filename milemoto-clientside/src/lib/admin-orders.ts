import { authorizedGet, authorizedPost } from './api';
import { buildUrlWithQuery } from './queryString';

import type {
  AdminOrderDetailResponse,
  AdminOrderFilterOptionsResponse,
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

export function fetchAdminOrderFilterOptions(): Promise<AdminOrderFilterOptionsResponse> {
  return authorizedGet<AdminOrderFilterOptionsResponse>('/admin/orders/filter-options');
}

function transitionAdminOrder(
  id: number,
  action: 'confirm' | 'process' | 'ship' | 'deliver' | 'cancel',
  reason?: string,
): Promise<AdminOrderDetailResponse> {
  return authorizedPost<AdminOrderDetailResponse>(`/admin/orders/${id}/${action}`, {
    ...(reason ? { reason } : {}),
  });
}

export function confirmAdminOrder(id: number, reason?: string) {
  return transitionAdminOrder(id, 'confirm', reason);
}

export function processAdminOrder(id: number, reason?: string) {
  return transitionAdminOrder(id, 'process', reason);
}

export function shipAdminOrder(id: number, reason?: string) {
  return transitionAdminOrder(id, 'ship', reason);
}

export function deliverAdminOrder(id: number, reason?: string) {
  return transitionAdminOrder(id, 'deliver', reason);
}

export function cancelAdminOrder(id: number, reason?: string) {
  return transitionAdminOrder(id, 'cancel', reason);
}
