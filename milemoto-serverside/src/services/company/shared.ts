import type { CompanyProfile, CompanyProfileResponse } from '@milemoto/types';

type CompanyJoined = CompanyProfile & {
  countryName: string | null;
  countryStatus: 'active' | 'inactive' | null;
};

export function mapCompanyRow(row: CompanyJoined | undefined): CompanyProfileResponse | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    publicEmail: row.publicEmail,
    phone: row.phone,
    website: row.website,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    countryId: row.countryId,
    countryName: row.countryName ?? null,
    countryStatus: row.countryStatus ?? null,
    latitude: row.latitude !== null ? String(row.latitude) : null,
    longitude: row.longitude !== null ? String(row.longitude) : null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}
