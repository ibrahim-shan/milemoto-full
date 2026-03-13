import { authorizedGet, authorizedPost } from './api';
import { getAccessToken } from './authStorage';
import { buildUrlWithQuery } from './queryString';

import type {
  AdminInvoiceDetailResponse,
  AdminInvoicesListQueryDto,
  AdminInvoicesListResponse,
  CreateInvoiceFromOrderDto,
} from '@/types';

export function fetchAdminInvoices(
  params: Partial<AdminInvoicesListQueryDto>,
): Promise<AdminInvoicesListResponse> {
  const url = buildUrlWithQuery(
    '/admin/invoices',
    params as Record<string, string | number | boolean | null | undefined>,
  );
  return authorizedGet<AdminInvoicesListResponse>(url);
}

export function fetchAdminInvoiceById(id: number): Promise<AdminInvoiceDetailResponse> {
  return authorizedGet<AdminInvoiceDetailResponse>(`/admin/invoices/${id}`);
}

export function createAdminInvoiceFromOrder(
  orderId: number,
  payload: CreateInvoiceFromOrderDto,
): Promise<AdminInvoiceDetailResponse> {
  return authorizedPost<AdminInvoiceDetailResponse>(`/admin/invoices/from-order/${orderId}`, payload);
}

export async function downloadAdminInvoicePdf(id: number): Promise<{ blob: Blob; filename: string }> {
  const token = typeof window !== 'undefined' ? getAccessToken() : null;
  const res = await fetch(`/api/v1/admin/invoices/${id}/pdf`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const maybeJson = res.headers.get('content-type')?.includes('application/json');
    const body = maybeJson ? ((await res.json()) as { message?: string }) : null;
    throw new Error(body?.message || 'Failed to download invoice PDF');
  }

  const contentDisposition = res.headers.get('content-disposition') || '';
  const filenameMatch = contentDisposition.match(/filename="(.+)"/i);
  const filename = filenameMatch?.[1] || `invoice-${id}.pdf`;
  const blob = await res.blob();
  return { blob, filename };
}
