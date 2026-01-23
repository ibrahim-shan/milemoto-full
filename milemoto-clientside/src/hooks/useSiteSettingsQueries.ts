import type {
  BrandingSettingsDto,
  DocumentSettingsDto,
  FeatureTogglesSettingsDto,
  LocalizationSettingsDto,
  StoreCurrencySettingsDto,
  UpdateBrandingSettingsDto,
  UpdateDocumentSettingsDto,
  UpdateFeatureTogglesSettingsDto,
  UpdateLocalizationSettingsDto,
  UpdateStoreCurrencySettingsDto,
} from '@milemoto/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authorizedGet, authorizedPut } from '@/lib/api';

// ==== Query Keys & API Paths ====================================

const API_BASE = '/admin/site-settings';

export const siteSettingsKeys = {
  all: ['siteSettings'] as const,
  localization: () => [...siteSettingsKeys.all, 'localization'] as const,
  storeCurrency: () => [...siteSettingsKeys.all, 'storeCurrency'] as const,
  branding: () => [...siteSettingsKeys.all, 'branding'] as const,
  documents: () => [...siteSettingsKeys.all, 'documents'] as const,
  featureToggles: () => [...siteSettingsKeys.all, 'featureToggles'] as const,
};

type QueryOptions = {
  enabled?: boolean;
};

// ==== Fetch Functions ===========================================

const getLocalizationSettings = () =>
  authorizedGet<LocalizationSettingsDto>(`${API_BASE}/localization`);

const updateLocalizationSettings = (data: UpdateLocalizationSettingsDto) =>
  authorizedPut<LocalizationSettingsDto>(`${API_BASE}/localization`, data);

const getStoreCurrencySettings = () =>
  authorizedGet<StoreCurrencySettingsDto>(`${API_BASE}/store-currency`);

const updateStoreCurrencySettings = (data: UpdateStoreCurrencySettingsDto) =>
  authorizedPut<StoreCurrencySettingsDto>(`${API_BASE}/store-currency`, data);

const getBrandingSettings = () => authorizedGet<BrandingSettingsDto>(`${API_BASE}/branding`);

const updateBrandingSettings = (data: UpdateBrandingSettingsDto) =>
  authorizedPut<BrandingSettingsDto>(`${API_BASE}/branding`, data);

const getDocumentSettings = () => authorizedGet<DocumentSettingsDto>(`${API_BASE}/documents`);

const updateDocumentSettings = (data: UpdateDocumentSettingsDto) =>
  authorizedPut<DocumentSettingsDto>(`${API_BASE}/documents`, data);

const getFeatureTogglesSettings = () =>
  authorizedGet<FeatureTogglesSettingsDto>(`${API_BASE}/feature-toggles`);

const updateFeatureTogglesSettings = (data: UpdateFeatureTogglesSettingsDto) =>
  authorizedPut<FeatureTogglesSettingsDto>(`${API_BASE}/feature-toggles`, data);

// ==== Hooks =====================================================

export const useGetLocalizationSettings = () =>
  useQuery({
    queryKey: siteSettingsKeys.localization(),
    queryFn: getLocalizationSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export const useUpdateLocalizationSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateLocalizationSettingsDto) => {
      const promise = updateLocalizationSettings(data);
      toast.promise(promise, {
        loading: 'Saving localization settings...',
        success: 'Settings saved successfully.',
        error: 'Failed to save settings.',
      });
      return await promise;
    },
    onSuccess: data => {
      queryClient.setQueryData(siteSettingsKeys.localization(), data);
    },
  });
};

export const useGetStoreCurrencySettings = (options?: QueryOptions) =>
  useQuery({
    queryKey: siteSettingsKeys.storeCurrency(),
    queryFn: getStoreCurrencySettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled ?? true,
  });

export const useUpdateStoreCurrencySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateStoreCurrencySettingsDto) => {
      const promise = updateStoreCurrencySettings(data);
      toast.promise(promise, {
        loading: 'Saving store & currency settings...',
        success: 'Settings saved successfully.',
        error: 'Failed to save settings.',
      });
      return await promise;
    },
    onSuccess: data => {
      queryClient.setQueryData(siteSettingsKeys.storeCurrency(), data);
    },
  });
};

export const useGetBrandingSettings = () =>
  useQuery({
    queryKey: siteSettingsKeys.branding(),
    queryFn: getBrandingSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export const useUpdateBrandingSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateBrandingSettingsDto) => {
      const promise = updateBrandingSettings(data);
      toast.promise(promise, {
        loading: 'Saving branding settings...',
        success: 'Settings saved successfully.',
        error: 'Failed to save settings.',
      });
      return await promise;
    },
    onSuccess: data => {
      queryClient.setQueryData(siteSettingsKeys.branding(), data);
    },
  });
};

export const useGetDocumentSettings = () =>
  useQuery({
    queryKey: siteSettingsKeys.documents(),
    queryFn: getDocumentSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export const useUpdateDocumentSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateDocumentSettingsDto) => {
      const promise = updateDocumentSettings(data);
      toast.promise(promise, {
        loading: 'Saving document settings...',
        success: 'Settings saved successfully.',
        error: 'Failed to save settings.',
      });
      return await promise;
    },
    onSuccess: data => {
      queryClient.setQueryData(siteSettingsKeys.documents(), data);
    },
  });
};

export const useGetFeatureTogglesSettings = () =>
  useQuery({
    queryKey: siteSettingsKeys.featureToggles(),
    queryFn: getFeatureTogglesSettings,
    staleTime: 5 * 60 * 1000,
  });

export const useUpdateFeatureTogglesSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateFeatureTogglesSettingsDto) => {
      const promise = updateFeatureTogglesSettings(data);
      toast.promise(promise, {
        loading: 'Saving feature toggles...',
        success: 'Settings saved successfully.',
        error: 'Failed to save settings.',
      });
      return await promise;
    },
    onSuccess: data => {
      queryClient.setQueryData(siteSettingsKeys.featureToggles(), data);
    },
  });
};
