import type {
  BrandingSettingsDto,
  DocumentSettingsDto,
  FeatureTogglesSettingsDto,
  InvoicePolicySettingsDto,
  LocalizationSettingsDto,
  OrderRequestPolicySettingsDto,
  StockDisplaySettingsDto,
  StoreCurrencySettingsDto,
  TaxPolicySettingsDto,
  UpdateBrandingSettingsDto,
  UpdateDocumentSettingsDto,
  UpdateFeatureTogglesSettingsDto,
  UpdateInvoicePolicySettingsDto,
  UpdateLocalizationSettingsDto,
  UpdateOrderRequestPolicySettingsDto,
  UpdateStockDisplaySettingsDto,
  UpdateStoreCurrencySettingsDto,
  UpdateTaxPolicySettingsDto,
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
  stockDisplay: () => [...siteSettingsKeys.all, 'stockDisplay'] as const,
  taxPolicy: () => [...siteSettingsKeys.all, 'taxPolicy'] as const,
  orderRequestPolicy: () => [...siteSettingsKeys.all, 'orderRequestPolicy'] as const,
  invoicePolicy: () => [...siteSettingsKeys.all, 'invoicePolicy'] as const,
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

const getStockDisplaySettings = () =>
  authorizedGet<StockDisplaySettingsDto>(`${API_BASE}/stock-display`);

const updateStockDisplaySettings = (data: UpdateStockDisplaySettingsDto) =>
  authorizedPut<StockDisplaySettingsDto>(`${API_BASE}/stock-display`, data);

const getTaxPolicySettings = () => authorizedGet<TaxPolicySettingsDto>(`${API_BASE}/tax-policy`);

const updateTaxPolicySettings = (data: UpdateTaxPolicySettingsDto) =>
  authorizedPut<TaxPolicySettingsDto>(`${API_BASE}/tax-policy`, data);

const getOrderRequestPolicySettings = () =>
  authorizedGet<OrderRequestPolicySettingsDto>(`${API_BASE}/order-request-policy`);

const updateOrderRequestPolicySettings = (data: UpdateOrderRequestPolicySettingsDto) =>
  authorizedPut<OrderRequestPolicySettingsDto>(`${API_BASE}/order-request-policy`, data);

const getInvoicePolicySettings = () =>
  authorizedGet<InvoicePolicySettingsDto>(`${API_BASE}/invoice-policy`);

const updateInvoicePolicySettings = (data: UpdateInvoicePolicySettingsDto) =>
  authorizedPut<InvoicePolicySettingsDto>(`${API_BASE}/invoice-policy`, data);

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

export const useGetStockDisplaySettings = () =>
  useQuery({
    queryKey: siteSettingsKeys.stockDisplay(),
    queryFn: getStockDisplaySettings,
    staleTime: 5 * 60 * 1000,
  });

export const useUpdateStockDisplaySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateStockDisplaySettingsDto) => {
      const promise = updateStockDisplaySettings(data);
      toast.promise(promise, {
        loading: 'Saving stock display settings...',
        success: 'Stock display settings saved successfully.',
        error: 'Failed to save stock display settings.',
      });
      return await promise;
    },
    onSuccess: data => {
      queryClient.setQueryData(siteSettingsKeys.stockDisplay(), data);
    },
  });
};

export const useGetTaxPolicySettings = () =>
  useQuery({
    queryKey: siteSettingsKeys.taxPolicy(),
    queryFn: getTaxPolicySettings,
    staleTime: 5 * 60 * 1000,
  });

export const useUpdateTaxPolicySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateTaxPolicySettingsDto) => {
      const promise = updateTaxPolicySettings(data);
      toast.promise(promise, {
        loading: 'Saving tax policy settings...',
        success: 'Tax policy settings saved successfully.',
        error: 'Failed to save tax policy settings.',
      });
      return await promise;
    },
    onSuccess: data => {
      queryClient.setQueryData(siteSettingsKeys.taxPolicy(), data);
    },
  });
};

export const useGetOrderRequestPolicySettings = () =>
  useQuery({
    queryKey: siteSettingsKeys.orderRequestPolicy(),
    queryFn: getOrderRequestPolicySettings,
    staleTime: 5 * 60 * 1000,
  });

export const useUpdateOrderRequestPolicySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateOrderRequestPolicySettingsDto) => {
      const promise = updateOrderRequestPolicySettings(data);
      toast.promise(promise, {
        loading: 'Saving order request policy settings...',
        success: 'Order request policy settings saved successfully.',
        error: 'Failed to save order request policy settings.',
      });
      return await promise;
    },
    onSuccess: data => {
      queryClient.setQueryData(siteSettingsKeys.orderRequestPolicy(), data);
    },
  });
};

export const useGetInvoicePolicySettings = () =>
  useQuery({
    queryKey: siteSettingsKeys.invoicePolicy(),
    queryFn: getInvoicePolicySettings,
    staleTime: 5 * 60 * 1000,
  });

export const useUpdateInvoicePolicySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateInvoicePolicySettingsDto) => {
      const promise = updateInvoicePolicySettings(data);
      toast.promise(promise, {
        loading: 'Saving invoice policy settings...',
        success: 'Invoice policy settings saved successfully.',
        error: 'Failed to save invoice policy settings.',
      });
      return await promise;
    },
    onSuccess: data => {
      queryClient.setQueryData(siteSettingsKeys.invoicePolicy(), data);
    },
  });
};
