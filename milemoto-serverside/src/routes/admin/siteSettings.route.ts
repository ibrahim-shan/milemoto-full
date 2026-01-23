import { Router } from 'express';
import { requirePermission } from '../../middleware/authz.js';

import {
  UpdateLocalizationSettings,
  UpdateStoreCurrencySettings,
  UpdateBrandingSettings,
  UpdateDocumentSettings,
  UpdateFeatureTogglesSettings,
} from './helpers/siteSettings.helpers.js';
import * as siteSettingsService from '../../services/siteSettings.service.js';

const router = Router();

// Secure all routes

// ==== Endpoints =================================================

/**
 * GET /api/v1/admin/site-settings/localization
 * Get localization settings
 */
router.get('/localization', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const settings = await siteSettingsService.getLocalizationSettings();
    res.json(settings);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/v1/admin/site-settings/localization
 * Update localization settings
 */
router.put('/localization', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const body = UpdateLocalizationSettings.parse(req.body);
    const updated = await siteSettingsService.updateLocalizationSettings(body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/v1/admin/site-settings/store-currency
 * Get store & currency settings
 */
router.get('/store-currency', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const settings = await siteSettingsService.getStoreCurrencySettings();
    res.json(settings);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/v1/admin/site-settings/store-currency
 * Update store & currency settings
 */
router.put('/store-currency', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const body = UpdateStoreCurrencySettings.parse(req.body);
    const updated = await siteSettingsService.updateStoreCurrencySettings(body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/v1/admin/site-settings/branding
 * Get branding settings
 */
router.get('/branding', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const settings = await siteSettingsService.getBrandingSettings();
    res.json(settings);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/v1/admin/site-settings/branding
 * Update branding settings
 */
router.put('/branding', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const body = UpdateBrandingSettings.parse(req.body);
    const updated = await siteSettingsService.updateBrandingSettings(body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/v1/admin/site-settings/documents
 * Get document settings
 */
router.get('/documents', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const settings = await siteSettingsService.getDocumentSettings();
    res.json(settings);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/v1/admin/site-settings/documents
 * Update document settings
 */
router.put('/documents', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const body = UpdateDocumentSettings.parse(req.body);
    const updated = await siteSettingsService.updateDocumentSettings(body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/v1/admin/site-settings/feature-toggles
 * Get feature toggle settings
 */
router.get('/feature-toggles', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const settings = await siteSettingsService.getFeatureTogglesSettings();
    res.json(settings);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/v1/admin/site-settings/feature-toggles
 * Update feature toggle settings
 */
router.put('/feature-toggles', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const body = UpdateFeatureTogglesSettings.parse(req.body);
    const updated = await siteSettingsService.updateFeatureTogglesSettings(body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

export default router;
