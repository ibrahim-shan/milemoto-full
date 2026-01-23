import type {
  CreateSmsGatewayDto,
  SendTestSmsDto,
  SendTestWhatsappDto,
  SmsDeliveryReportResponseDto,
  SmsGatewayResponseDto,
  UpdateSmsGatewayDto,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';

const API_BASE = '/admin/sms-gateways';

export const smsGatewayKeys = {
  all: ['smsGateways'] as const,
  reports: (limit: number) => ['smsGateways', 'deliveryReports', limit] as const,
};

const getSmsGateways = () => authorizedGet<SmsGatewayResponseDto[]>(API_BASE);

const createSmsGateway = (data: CreateSmsGatewayDto) =>
  authorizedPost<SmsGatewayResponseDto>(API_BASE, data);

const updateSmsGateway = (id: number, data: UpdateSmsGatewayDto) =>
  authorizedPut<SmsGatewayResponseDto>(`${API_BASE}/${id}`, data);

const activateSmsGateway = (id: number) =>
  authorizedPost<SmsGatewayResponseDto>(`${API_BASE}/${id}/activate`, {});

const sendTestSms = (data: SendTestSmsDto) =>
  authorizedPost<{ ok: true }>(`${API_BASE}/test`, data);

const sendTestWhatsapp = (data: SendTestWhatsappDto) =>
  authorizedPost<{ ok: true }>(`${API_BASE}/test-whatsapp`, data);

const getSmsDeliveryReports = (limit: number) =>
  authorizedGet<SmsDeliveryReportResponseDto[]>(`${API_BASE}/delivery-reports?limit=${limit}`);

export const useGetSmsGateways = () =>
  useQuery({
    queryKey: smsGatewayKeys.all,
    queryFn: getSmsGateways,
    staleTime: 60 * 1000,
  });

export const useGetSmsDeliveryReports = (limit = 10) =>
  useQuery({
    queryKey: smsGatewayKeys.reports(limit),
    queryFn: () => getSmsDeliveryReports(limit),
    staleTime: 30 * 1000,
  });

export const useCreateSmsGateway = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSmsGatewayDto) => {
      const promise = createSmsGateway(data);
      toast.promise(promise, {
        loading: 'Saving SMS gateway...',
        success: 'SMS gateway saved.',
        error: err => (err instanceof Error ? err.message : 'Failed to save SMS gateway.'),
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsGatewayKeys.all });
    },
  });
};

export const useUpdateSmsGateway = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateSmsGatewayDto }) => {
      const promise = updateSmsGateway(id, data);
      toast.promise(promise, {
        loading: 'Saving SMS gateway...',
        success: 'SMS gateway updated.',
        error: err => (err instanceof Error ? err.message : 'Failed to update SMS gateway.'),
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsGatewayKeys.all });
    },
  });
};

export const useActivateSmsGateway = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const promise = activateSmsGateway(id);
      toast.promise(promise, {
        loading: 'Activating SMS gateway...',
        success: 'SMS gateway activated.',
        error: err => (err instanceof Error ? err.message : 'Failed to activate SMS gateway.'),
      });
      return await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsGatewayKeys.all });
    },
  });
};

export const useSendTestSms = () =>
  useMutation({
    mutationFn: async (data: SendTestSmsDto) => {
      const promise = sendTestSms(data);
      toast.promise(promise, {
        loading: 'Sending test SMS...',
        success: 'Test SMS sent.',
        error: err => (err instanceof Error ? err.message : 'Failed to send test SMS.'),
      });
      return await promise;
    },
  });

export const useSendTestWhatsapp = () =>
  useMutation({
    mutationFn: async (data: SendTestWhatsappDto) => {
      const promise = sendTestWhatsapp(data);
      toast.promise(promise, {
        loading: 'Sending test WhatsApp message...',
        success: 'Test WhatsApp message sent.',
        error: err =>
          err instanceof Error ? err.message : 'Failed to send test WhatsApp message.',
      });
      return await promise;
    },
  });
