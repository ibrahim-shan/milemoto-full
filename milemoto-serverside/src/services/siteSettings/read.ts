import type {
  BrandingSettingsDto,
  DocumentSettingsDto,
  FeatureTogglesSettingsDto,
  LocalizationSettingsDto,
  StoreCurrencySettingsDto,
} from '@milemoto/types';
import { getSetting, parseSettingBool } from './shared.js';

export async function getLocalizationSettings(): Promise<LocalizationSettingsDto> {
  const dateFormat = await getSetting('dateFormat');
  const timeFormat = await getSetting('timeFormat');
  const defaultTimezone = await getSetting('defaultTimezone');
  const defaultLanguageId = await getSetting('defaultLanguageId');

  return {
    dateFormat: (dateFormat as LocalizationSettingsDto['dateFormat']) || 'MM/DD/YYYY',
    timeFormat: (timeFormat as LocalizationSettingsDto['timeFormat']) || '12h',
    defaultTimezone: defaultTimezone || 'Asia/Beirut',
    defaultLanguageId: defaultLanguageId ? parseInt(defaultLanguageId) : 1,
  };
}

export async function getStoreCurrencySettings(): Promise<StoreCurrencySettingsDto> {
  const defaultCurrencyId = await getSetting('defaultCurrencyId');
  const currencyPosition = await getSetting('currencyPosition');
  const decimalDigits = await getSetting('decimalDigits');
  const copyrightText = await getSetting('copyrightText');

  return {
    defaultCurrencyId: defaultCurrencyId ? parseInt(defaultCurrencyId) : 1,
    currencyPosition:
      (currencyPosition as StoreCurrencySettingsDto['currencyPosition']) || 'before',
    decimalDigits: decimalDigits ? parseInt(decimalDigits) : 2,
    copyrightText: copyrightText || 'Ac 2025 MileMoto. All rights reserved.',
  };
}

export async function getBrandingSettings(): Promise<BrandingSettingsDto> {
  const logoUrl = await getSetting('logoUrl');
  const faviconUrl = await getSetting('faviconUrl');

  return {
    logoUrl: logoUrl || null,
    faviconUrl: faviconUrl || null,
  };
}

export async function getDocumentSettings(): Promise<DocumentSettingsDto> {
  const purchaseOrderTerms = await getSetting('purchaseOrderTerms');

  return {
    purchaseOrderTerms: purchaseOrderTerms || null,
  };
}

export async function getFeatureTogglesSettings(): Promise<FeatureTogglesSettingsDto> {
  const cashOnDeliveryEnabled = await getSetting('cashOnDeliveryEnabled');
  const onlinePaymentEnabled = await getSetting('onlinePaymentEnabled');
  const languageSwitcherEnabled = await getSetting('languageSwitcherEnabled');
  const phoneVerificationEnabled = await getSetting('phoneVerificationEnabled');
  const emailVerificationEnabled = await getSetting('emailVerificationEnabled');

  return {
    cashOnDeliveryEnabled: parseSettingBool(cashOnDeliveryEnabled, true),
    onlinePaymentEnabled: parseSettingBool(onlinePaymentEnabled, true),
    languageSwitcherEnabled: parseSettingBool(languageSwitcherEnabled, false),
    phoneVerificationEnabled: parseSettingBool(phoneVerificationEnabled, true),
    emailVerificationEnabled: parseSettingBool(emailVerificationEnabled, true),
  };
}
