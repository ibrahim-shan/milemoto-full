import { Router } from 'express';
import { requirePermission } from '../../middleware/authz.js';
import { CompanyProfileInput } from './helpers/company.helpers.js';
import { getCompanyProfile, upsertCompanyProfile } from '../../services/company.service.js';

const router = Router();

/**
 * GET /api/v1/admin/company
 * Get the company profile
 */
router.get('/', requirePermission('settings.read'), async (_req, res, next) => {
  try {
    const profile = await getCompanyProfile();
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/company
 * Update the company profile
 */
router.put('/', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const payload = CompanyProfileInput.parse(req.body);
    const profile = await upsertCompanyProfile(payload);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

export default router;
