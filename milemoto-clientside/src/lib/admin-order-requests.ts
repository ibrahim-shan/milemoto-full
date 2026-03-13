import { authorizedGet, authorizedPost } from './api';
import { buildUrlWithQuery } from './queryString';

import type {
  AdminOrderRequestItem,
  AdminOrderRequestsListQueryDto,
  AdminOrderRequestsListResponse,
  CompleteOrderRequestDto,
  DecideOrderRequestDto,
} from '@/types';

export type AdminOrderRequestRestockLocation = {
  id: number;
  name: string;
  status: string | null;
};

export function fetchAdminOrderRequests(
  params: Partial<AdminOrderRequestsListQueryDto>,
): Promise<AdminOrderRequestsListResponse> {
  const url = buildUrlWithQuery(
    '/admin/order-requests',
    params as Record<string, string | number | boolean | null | undefined>,
  );
  return authorizedGet<AdminOrderRequestsListResponse>(url);
}

export function fetchAdminOrderRequestById(id: number): Promise<AdminOrderRequestItem> {
  return authorizedGet<AdminOrderRequestItem>(`/admin/order-requests/${id}`);
}

export function decideAdminOrderRequest(
  id: number,
  payload: DecideOrderRequestDto,
): Promise<AdminOrderRequestItem> {
  return authorizedPost<AdminOrderRequestItem>(`/admin/order-requests/${id}/decide`, payload);
}

export function completeAdminOrderRequest(
  id: number,
  payload: CompleteOrderRequestDto,
): Promise<AdminOrderRequestItem> {
  return authorizedPost<AdminOrderRequestItem>(`/admin/order-requests/${id}/complete`, payload);
}

export function fetchAdminOrderRequestRestockLocations(): Promise<{
  items: AdminOrderRequestRestockLocation[];
}> {
  return authorizedGet<{ items: AdminOrderRequestRestockLocation[] }>(
    '/admin/order-requests/restock-locations',
  );
}
