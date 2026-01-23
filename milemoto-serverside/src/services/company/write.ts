import { companyprofile } from '@milemoto/types';
import type { CompanyProfileInputDto, CompanyProfileResponse } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { getCompanyProfile } from './read.js';

export async function upsertCompanyProfile(
  payload: CompanyProfileInputDto
): Promise<CompanyProfileResponse | null> {
  const lat = payload.latitude ?? null;
  const lng = payload.longitude ?? null;
  const countryId = payload.countryId ?? null;

  const values: typeof companyprofile.$inferInsert = {
    name: payload.name,
    publicEmail: payload.publicEmail ?? null,
    phone: payload.phone ?? null,
    website: payload.website ?? null,
    address: payload.address ?? null,
    city: payload.city ?? null,
    state: payload.state ?? null,
    zip: payload.zip ?? null,
    countryId: countryId,
    latitude: lat === null ? null : String(lat),
    longitude: lng === null ? null : String(lng),
  };

  await db
    .insert(companyprofile)
    .values(values)
    .onDuplicateKeyUpdate({
      set: {
        id: 1,
        name: values.name,
        publicEmail: values.publicEmail,
        phone: values.phone,
        website: values.website,
        address: values.address,
        city: values.city,
        state: values.state,
        zip: values.zip,
        countryId: values.countryId,
        latitude: values.latitude,
        longitude: values.longitude,
      },
    });

  return getCompanyProfile();
}
