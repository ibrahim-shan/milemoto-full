import { authorizedDel, authorizedGet, authorizedPost } from './api';
import { buildUrlWithQuery } from './queryString';

import type {
  AdminBulkModerateReviewsResponse,
  AdminModerateReviewDto,
  AdminReviewListItem,
  AdminReviewsListQueryDto,
  AdminReviewsListResponse,
} from '@/types';

export function fetchAdminReviews(
  params: Partial<AdminReviewsListQueryDto>,
): Promise<AdminReviewsListResponse> {
  const url = buildUrlWithQuery(
    '/admin/reviews',
    params as Record<string, string | number | boolean | null | undefined>,
  );
  return authorizedGet<AdminReviewsListResponse>(url);
}

export function fetchAdminReviewById(id: number): Promise<AdminReviewListItem> {
  return authorizedGet<AdminReviewListItem>(`/admin/reviews/${id}`);
}

export function moderateAdminReview(
  id: number,
  payload: AdminModerateReviewDto,
): Promise<AdminReviewListItem> {
  return authorizedPost<AdminReviewListItem>(`/admin/reviews/${id}/moderate`, payload);
}

export function bulkModerateAdminReviews(payload: {
  reviewIds: number[];
  status: 'approved' | 'rejected';
  note?: string;
}): Promise<AdminBulkModerateReviewsResponse> {
  return authorizedPost<AdminBulkModerateReviewsResponse>('/admin/reviews/bulk-moderate', payload);
}

export function deleteAdminReview(id: number): Promise<void> {
  return authorizedDel<void>(`/admin/reviews/${id}`);
}
