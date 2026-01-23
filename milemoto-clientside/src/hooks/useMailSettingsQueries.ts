import type {
  MailSettingsResponseDto,
  SendTestEmailDto,
  UpdateMailSettingsDto,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedGet, authorizedPost, authorizedPut } from '@/lib/api';

const API_BASE = '/admin/mail';

export const mailSettingsKeys = {
  all: ['mail-settings'] as const,
  settings: () => [...mailSettingsKeys.all, 'settings'] as const,
};

const getMailSettings = () => authorizedGet<MailSettingsResponseDto>(API_BASE);

const updateMailSettings = (data: UpdateMailSettingsDto) =>
  authorizedPut<MailSettingsResponseDto>(API_BASE, data);

const sendTestEmail = (data: SendTestEmailDto) =>
  authorizedPost<{ ok: true }>(`${API_BASE}/test`, data);

export const useGetMailSettings = () =>
  useQuery({
    queryKey: mailSettingsKeys.settings(),
    queryFn: getMailSettings,
    staleTime: 5 * 60 * 1000,
  });

export const useUpdateMailSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateMailSettingsDto) => {
      const promise = updateMailSettings(data);
      toast.promise(promise, {
        loading: 'Saving mail settings...',
        success: 'Mail settings saved.',
        error: e => (e instanceof Error ? e.message : 'Failed to save mail settings.'),
      });
      return await promise;
    },
    onSuccess: data => {
      queryClient.setQueryData(mailSettingsKeys.settings(), data);
    },
  });
};

export const useSendTestEmail = () => {
  return useMutation({
    mutationFn: async (data: SendTestEmailDto) => {
      const promise = sendTestEmail(data);
      toast.promise(promise, {
        loading: 'Sending test email...',
        success: 'Test email sent.',
        error: e => (e instanceof Error ? e.message : 'Failed to send test email.'),
      });
      return await promise;
    },
  });
};
