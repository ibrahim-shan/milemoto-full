import { and, eq, or, sql } from 'drizzle-orm';
import { purchaseorders, vendors } from '@milemoto/types';
import type { CreateVendorDto, UpdateVendorDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { isDuplicateEntryError, isRowIsReferencedError } from '../../utils/dbErrors.js';
import { buildDeleteResponse } from '../../utils/response.js';
import { getVendor } from './read.js';

export async function createVendor(data: CreateVendorDto) {
  try {
    const normalizedName = data.name.trim();
    const normalizedEmail = data.email?.trim();
    const normalizedPhoneNumber = data.phoneNumber?.trim();
    const normalizedPhoneCode = data.phoneCode?.trim();
    const emailValue = normalizedEmail === '' ? null : (normalizedEmail ?? null);
    const phoneValue = normalizedPhoneNumber === '' ? null : (normalizedPhoneNumber ?? null);
    const phoneCodeValue = normalizedPhoneCode === '' ? null : (normalizedPhoneCode ?? null);

    const [existing] = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(eq(vendors.name, normalizedName))
      .limit(1);

    if (existing) {
      throw httpError(409, 'Conflict', 'A vendor with this name already exists');
    }

    const contactFilters: (ReturnType<typeof and> | ReturnType<typeof eq>)[] = [];
    if (normalizedEmail) {
      contactFilters.push(eq(vendors.email, normalizedEmail));
    }
    if (normalizedPhoneNumber && normalizedPhoneCode) {
      contactFilters.push(
        and(
          eq(vendors.phoneNumber, normalizedPhoneNumber),
          eq(vendors.phoneCode, normalizedPhoneCode)
        )
      );
    }

    if (contactFilters.length > 0) {
      const [contactExists] = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(contactFilters.length === 1 ? contactFilters[0] : or(...contactFilters))
        .limit(1);

      if (contactExists) {
        throw httpError(
          409,
          'DuplicateVendorContact',
          'Those contact details are already assigned to a vendor'
        );
      }
    }

    const result = await db.insert(vendors).values({
      name: normalizedName,
      description: data.description ?? null,
      country: data.country,
      address: data.address ?? null,
      phoneNumber: phoneValue,
      phoneCode: phoneCodeValue,
      email: emailValue,
      website: data.website ?? null,
      status: data.status ?? 'active',
    });

    const insertId =
      'insertId' in result
        ? Number((result as unknown as { insertId: number }).insertId)
        : undefined;
    if (insertId) return getVendor(insertId);

    const [created] = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(eq(vendors.name, normalizedName))
      .limit(1);
    if (created) return getVendor(created.id);

    throw httpError(500, 'InsertFailed', 'Failed to create vendor');
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateVendor', 'A vendor with this name already exists');
    }
    throw err;
  }
}

export async function updateVendor(id: number, data: UpdateVendorDto) {
  try {
    const vendor = await getVendor(id);
    const normalizedName = data.name?.trim();
    const normalizedEmail = data.email?.trim();
    const normalizedPhoneNumber = data.phoneNumber?.trim();
    const normalizedPhoneCode = data.phoneCode?.trim();
    const emailValue = normalizedEmail === '' ? null : (normalizedEmail ?? null);
    const phoneValue = normalizedPhoneNumber === '' ? null : (normalizedPhoneNumber ?? null);
    const phoneCodeValue = normalizedPhoneCode === '' ? null : (normalizedPhoneCode ?? null);

    if (normalizedName && normalizedName !== vendor.name.trim()) {
      const [existing] = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(and(eq(vendors.name, normalizedName), sql`${vendors.id} != ${id}`))
        .limit(1);

      if (existing) {
        throw httpError(409, 'Conflict', 'A vendor with this name already exists');
      }
    }

    const contactFilters: (ReturnType<typeof and> | ReturnType<typeof eq>)[] = [];
    if (normalizedEmail) {
      contactFilters.push(eq(vendors.email, normalizedEmail));
    }
    if (normalizedPhoneNumber && normalizedPhoneCode) {
      contactFilters.push(
        and(
          eq(vendors.phoneNumber, normalizedPhoneNumber),
          eq(vendors.phoneCode, normalizedPhoneCode)
        )
      );
    }

    if (contactFilters.length > 0) {
      const [contactExists] = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(
          and(
            contactFilters.length === 1 ? contactFilters[0] : or(...contactFilters),
            sql`${vendors.id} != ${id}`
          )
        )
        .limit(1);

      if (contactExists) {
        throw httpError(
          409,
          'DuplicateVendorContact',
          'Those contact details are already assigned to a vendor'
        );
      }
    }

    const updates: Partial<typeof vendors.$inferInsert> = {};

    if (data.name !== undefined) {
      updates.name = normalizedName ?? vendor.name.trim();
    }
    if (data.description !== undefined) {
      updates.description = data.description ?? null;
    }
    if (data.country !== undefined) {
      updates.country = data.country;
    }
    if (data.address !== undefined) {
      updates.address = data.address ?? null;
    }
    if (data.phoneNumber !== undefined) {
      updates.phoneNumber = phoneValue;
    }
    if (data.phoneCode !== undefined) {
      updates.phoneCode = phoneCodeValue;
    }
    if (data.email !== undefined) {
      updates.email = emailValue;
    }
    if (data.website !== undefined) {
      updates.website = data.website ?? null;
    }
    if (data.status !== undefined) {
      updates.status = data.status;
    }

    if (Object.keys(updates).length === 0) return vendor;

    await db.update(vendors).set(updates).where(eq(vendors.id, id));

    return getVendor(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateVendor', 'A vendor with this name already exists');
    }
    throw err;
  }
}

export async function deleteVendor(id: number) {
  try {
    const [poReference] = await db
      .select({ id: purchaseorders.id })
      .from(purchaseorders)
      .where(eq(purchaseorders.vendorId, id))
      .limit(1);

    if (poReference) {
      throw httpError(
        409,
        'VendorInUse',
        'Vendor is linked to existing purchase orders and cannot be deleted. Deactivate instead.'
      );
    }

    const result = await db.delete(vendors).where(eq(vendors.id, id));
    const affected =
      'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
    if (!affected) {
      const [exists] = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.id, id))
        .limit(1);
      if (!exists) {
        return buildDeleteResponse();
      }
      throw httpError(404, 'NotFound', 'Vendor not found');
    }
    return buildDeleteResponse();
  } catch (err) {
    if (isRowIsReferencedError(err)) {
      throw httpError(
        409,
        'VendorInUse',
        'Vendor is linked to other records (e.g., purchase orders) and cannot be deleted. Deactivate instead.'
      );
    }
    throw err;
  }
}
