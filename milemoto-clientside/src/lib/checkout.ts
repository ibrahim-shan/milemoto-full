import { authorizedGet, authorizedPost } from './api';

import type {
  CheckoutQuoteDto,
  CheckoutQuoteResponse,
  CheckoutSubmitDto,
  CheckoutSubmitResponse,
  CustomerOrderDetailResponse,
  CustomerOrdersListResponse,
} from '@/types';

export function fetchCheckoutQuote(payload: CheckoutQuoteDto): Promise<CheckoutQuoteResponse> {
  return authorizedPost<CheckoutQuoteResponse>('/checkout/quote', payload);
}

export function submitCheckout(payload: CheckoutSubmitDto): Promise<CheckoutSubmitResponse> {
  return authorizedPost<CheckoutSubmitResponse>('/checkout/submit', payload);
}

export function fetchMyOrders(): Promise<CustomerOrdersListResponse> {
  return authorizedGet<CustomerOrdersListResponse>('/orders');
}

export function fetchMyOrderById(id: number): Promise<CustomerOrderDetailResponse> {
  return authorizedGet<CustomerOrderDetailResponse>(`/orders/${id}`);
}
