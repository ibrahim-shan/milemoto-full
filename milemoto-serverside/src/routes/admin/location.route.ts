import { Router } from 'express';

import { uploadJson } from '../../middleware/uploader.js';
import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import {
  CreateCountry,
  ListQuery,
  UpdateCountry,
  CreateState,
  UpdateState,
  CreateCity,
  UpdateCity,
  ImportCountries,
  CountryListQuery,
} from './helpers/location.helpers.js';
import {
  createCountry,
  listCountries,
  updateCountry,
  deleteCountry,
  listAllCountries,
  createState,
  listStates,
  updateState,
  deleteState,
  listAllStates,
  createCity,
  listCities,
  updateCity,
  deleteCity,
  exportCountries,
  importCountries as persistCountriesImport,
  exportStates,
  importStates as persistStatesImport,
  exportCities,
  importCities as persistCitiesImport,
  listAllCities,
} from '../../services/location.service.js';
import { httpError } from '../../utils/error.js';

// Create a new router instance for location-related admin endpoints
const router = Router();

// ==== COUNTRIES =================================================

/**
 * CREATE: POST /api/v1/admin/locations/countries
 * Create a new country
 */
router.post('/countries', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const payload = CreateCountry.parse(req.body);
    const country = await createCountry(payload);
    res.status(201).json(country);
  } catch (e) {
    next(e);
  }
});

/**
 * READ: GET /api/v1/admin/locations/countries
 * List countries with pagination and search
 */
router.get('/countries', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const query = CountryListQuery.parse(req.query);
    const data = await listCountries(query);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// ... (skipping unchanged parts)

router.get('/states', requirePermission('settings.read'), async (req, res, next) => {
  try {
    // 1. Extend ListQuery with optional filters for the route handler
    const StateListQuery = ListQuery.extend({
      countryId: z.coerce.number().int().optional(),
    });

    // 2. Parse the request query
    const query = StateListQuery.parse(req.query);

    // 3. Pass all filters (ListQuery + countryId) to the service
    const data = await listStates(query);

    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.get('/cities', requirePermission('settings.read'), async (req, res, next) => {
  try {
    // 1. Extend ListQuery with optional filters for the route handler
    const CityListQuery = ListQuery.extend({
      stateId: z.coerce.number().int().optional(),
    });

    // 2. Parse the request query
    const query = CityListQuery.parse(req.query);

    // 3. Pass all filters (ListQuery + stateId) to the service
    const data = await listCities(query);

    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * UPDATE: PUT /api/v1/admin/locations/countries/:id
 * Update an existing country
 */
router.put('/countries/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const countryId = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdateCountry.parse(req.body);

    if (Object.keys(body).length === 0) {
      throw httpError(400, 'ValidationError', 'At least one field to update must be provided');
    }

    const country = await updateCountry(countryId, body);
    res.json(country);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE: DELETE /api/v1/admin/locations/countries/:id
 * Delete a country
 */
router.delete('/countries/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const countryId = z.coerce.number().int().min(1).parse(req.params.id);
    await deleteCountry(countryId);
    res.status(204).end(); // No Content
  } catch (e) {
    next(e);
  }
});

// ==== SUPPORTING ENDPOINTS (Step 4) ==============================

/**
 * GET /api/v1/admin/locations/countries/all
 * Get a simple list of all active countries (for dropdowns)
 */
router.get('/countries/all', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const includeInactive =
      ['1', 'true', 'yes'].includes(String(req.query.includeInactive ?? '').toLowerCase()) || false;
    const items = await listAllCountries(includeInactive);
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// ==== STATES ====================================================

/**
 * CREATE: POST /api/v1/admin/locations/states
 * Create a new state
 */
router.post('/states', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const payload = CreateState.parse(req.body);
    const state = await createState(payload);
    res.status(201).json(state);
  } catch (e) {
    next(e);
  }
});

/**
 * UPDATE: PUT /api/v1/admin/locations/states/:id
 * Update an existing state
 */
router.put('/states/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const stateId = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdateState.parse(req.body);

    if (Object.keys(body).length === 0) {
      throw httpError(400, 'ValidationError', 'At least one field to update must be provided');
    }

    const updated = await updateState(stateId, body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE: DELETE /api/v1/admin/locations/states/:id
 * Delete a state
 */
router.delete('/states/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const stateId = z.coerce.number().int().min(1).parse(req.params.id);
    await deleteState(stateId);
    res.status(204).end(); // No Content
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/v1/admin/locations/states/all
 * Get a simple list of all active states (for dropdowns)
 */
router.get('/states/all', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const items = await listAllStates();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// ==== CITIES ====================================================

/**
 * CREATE: POST /api/v1/admin/locations/cities
 * Create a new city
 */
router.post('/cities', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const payload = CreateCity.parse(req.body);
    const city = await createCity(payload);
    res.status(201).json(city);
  } catch (e) {
    next(e);
  }
});

router.get('/cities/all', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const stateId = req.query.stateId
      ? z.coerce.number().int().min(1).parse(req.query.stateId)
      : undefined;
    const items = await listAllCities(stateId);
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

/**
 * UPDATE: PUT /api/v1/admin/locations/cities/:id
 * Update an existing city
 */
router.put('/cities/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const cityId = z.coerce.number().int().min(1).parse(req.params.id);
    const body = UpdateCity.parse(req.body);

    if (Object.keys(body).length === 0) {
      throw httpError(400, 'ValidationError', 'At least one field to update must be provided');
    }

    const updated = await updateCity(cityId, body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE: DELETE /api/v1/admin/locations/cities/:id
 * Delete a city
 */
router.delete('/cities/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const cityId = z.coerce.number().int().min(1).parse(req.params.id);
    await deleteCity(cityId);
    res.status(204).end(); // No Content
  } catch (e) {
    next(e);
  }
});

// ==== IMPORT / EXPORT ===========================================

// --- Countries Import/Export ---

router.get('/countries/export', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const filename = `export-countries-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const rows = await exportCountries();
    res.json(rows); // Send the complete JSON array
  } catch (e) {
    next(e);
  }
});

router.post(
  '/countries/import',
  requirePermission('settings.manage'),
  uploadJson.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw httpError(400, 'FileRequired', 'No JSON file uploaded');
      }

      const json = JSON.parse(req.file.buffer.toString('utf-8'));
      const rows = ImportCountries.parse(json);

      const affectedRows = await persistCountriesImport(rows);
      res.status(201).json({
        message: 'Import successful',
        affectedRows,
      });
    } catch (e) {
      next(e);
    }
  }
);

// --- States Import/Export ---

router.get('/states/export', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const filename = `export-states-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const rows = await exportStates();
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.post(
  '/states/import',
  requirePermission('settings.manage'),
  uploadJson.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw httpError(400, 'FileRequired', 'No JSON file uploaded');
      }

      const json = JSON.parse(req.file.buffer.toString('utf-8'));
      const importSchema = z.array(
        z.object({
          name: z.string().min(2),
          countryCode: z.string().min(2),
          status: z.enum(['active', 'inactive']),
        })
      );
      const rows = importSchema.parse(json);
      const affectedRows = await persistStatesImport(rows);

      res.status(201).json({
        message: 'Import successful',
        affectedRows,
      });
    } catch (e) {
      next(e);
    }
  }
);

// --- Cities Import/Export ---

router.get('/cities/export', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const filename = `export-cities-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const rows = await exportCities();
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.post(
  '/cities/import',
  requirePermission('settings.manage'),
  uploadJson.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw httpError(400, 'FileRequired', 'No JSON file uploaded');
      }

      const json = JSON.parse(req.file.buffer.toString('utf-8'));
      const importSchema = z.array(
        z.object({
          name: z.string().min(2),
          stateName: z.string().min(2),
          countryCode: z.string().min(2),
          status: z.enum(['active', 'inactive']),
        })
      );
      const rows = importSchema.parse(json);
      const affectedRows = await persistCitiesImport(rows);

      res.status(201).json({
        message: 'Import successful',
        affectedRows,
      });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
