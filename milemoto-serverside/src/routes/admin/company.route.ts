import { Router } from 'express';
import { requirePermission } from '../../middleware/authz.js';
import { CompanyProfileInput } from './helpers/company.helpers.js';
import { getCompanyProfile, upsertCompanyProfile } from '../../services/company.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

/**
 * GET /api/v1/admin/company
 * Get the company profile
 */
router.get(
  '/',
  requirePermission('settings.read'),
  asyncHandler(async (_req, res) => {
    const profile = await getCompanyProfile();
    res.json(profile);
  })
);

/**
 * PUT /api/v1/admin/company
 * Update the company profile
 */
router.put(
  '/',
  requirePermission('settings.manage'),
  asyncHandler(async (req, res) => {
    const payload = CompanyProfileInput.parse(req.body);
    const profile = await upsertCompanyProfile(payload);
    res.json(profile);
  })
);

export default router;
