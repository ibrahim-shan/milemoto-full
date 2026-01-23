import { eq } from 'drizzle-orm';
import { companyprofile, countries } from '@milemoto/types';
import type { CompanyProfileResponse } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { mapCompanyRow } from './shared.js';

export async function getCompanyProfile(): Promise<CompanyProfileResponse | null> {
  const row = await db
    .select({
      id: companyprofile.id,
      name: companyprofile.name,
      publicEmail: companyprofile.publicEmail,
      phone: companyprofile.phone,
      website: companyprofile.website,
      address: companyprofile.address,
      city: companyprofile.city,
      state: companyprofile.state,
      zip: companyprofile.zip,
      countryId: companyprofile.countryId,
      countryName: countries.name,
      countryStatus: countries.status,
      latitude: companyprofile.latitude,
      longitude: companyprofile.longitude,
      createdAt: companyprofile.createdAt,
      updatedAt: companyprofile.updatedAt,
    })
    .from(companyprofile)
    .leftJoin(countries, eq(countries.id, companyprofile.countryId))
    .where(eq(companyprofile.id, 1))
    .limit(1)
    .then((rows) => rows[0]);

  return mapCompanyRow(row);
}
