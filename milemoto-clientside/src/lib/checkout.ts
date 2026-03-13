import { authorizedGet, authorizedPost } from './api';

import type {
  CheckoutQuoteDto,
  CheckoutQuoteResponse,
  CheckoutSubmitDto,
  CheckoutSubmitResponse,
  CreateOrderRequestDto,
  CustomerOrderDetailResponse,
  CustomerOrderRequestsListResponse,
  CustomerOrdersListResponse,
  OrderRequestItem,
} from '@/types';

export function fetchCheckoutQuote(payload: CheckoutQuoteDto): Promise<CheckoutQuoteResponse> {
  return authorizedPost<CheckoutQuoteResponse>('/checkout/quote', payload);
}

export function submitCheckout(payload: CheckoutSubmitDto): Promise<CheckoutSubmitResponse> {
  return authorizedPost<CheckoutSubmitResponse>('/checkout/submit', payload);
}

export function fetchMyOrders(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<CustomerOrdersListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page !== undefined) searchParams.set('page', String(params.page));
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);
  const qs = searchParams.toString();
  return authorizedGet<CustomerOrdersListResponse>(`/orders${qs ? `?${qs}` : ''}`);
}

export function fetchMyOrderById(id: number): Promise<CustomerOrderDetailResponse> {
  return authorizedGet<CustomerOrderDetailResponse>(`/orders/${id}`);
}

export function fetchMyOrderRequestsForOrder(
  orderId: number,
  params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  },
): Promise<CustomerOrderRequestsListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page !== undefined) searchParams.set('page', String(params.page));
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.type) searchParams.set('type', params.type);
  const qs = searchParams.toString();
  return authorizedGet<CustomerOrderRequestsListResponse>(
    `/orders/${orderId}/requests${qs ? `?${qs}` : ''}`,
  );
}

export function createMyOrderRequest(
  orderId: number,
  payload: CreateOrderRequestDto,
): Promise<OrderRequestItem> {
  return authorizedPost<OrderRequestItem>(`/orders/${orderId}/requests`, payload);
}

export function cancelMyOrderRequest(
  requestId: number,
  payload?: { reason?: string },
): Promise<OrderRequestItem> {
  return authorizedPost<OrderRequestItem>(`/orders/requests/${requestId}/cancel`, payload ?? {});
}
