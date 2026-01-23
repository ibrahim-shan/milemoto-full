import { eq } from 'drizzle-orm';
import { languages } from '@milemoto/types';
import type { CreateLanguageDto, UpdateLanguageDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildDeleteResponse } from '../../utils/response.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { getLanguage } from './read.js';
import { formatLanguageRow } from './shared.js';

export async function createLanguage(data: CreateLanguageDto) {
  try {
    const result = await db.insert(languages).values({
      name: data.name,
      code: data.code,
      displayMode: data.displayMode ?? 'LTR',
      countryCode: data.countryCode ?? null,
      status: data.status ?? 'active',
    });

    const insertId =
      'insertId' in result
        ? Number((result as unknown as { insertId: number }).insertId)
        : undefined;
    if (insertId) {
      return await getLanguage(insertId);
    }

    const [created] = await db
      .select()
      .from(languages)
      .where(eq(languages.code, data.code))
      .limit(1);
    if (created) return formatLanguageRow(created);

    throw httpError(500, 'InsertFailed', 'Failed to create language');
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateLanguage', 'Language code already exists.');
    }
    throw err;
  }
}

export async function updateLanguage(id: number, data: UpdateLanguageDto) {
  const updates: Partial<CreateLanguageDto> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.code !== undefined) updates.code = data.code;
  if (data.displayMode !== undefined) updates.displayMode = data.displayMode;
  if (data.countryCode !== undefined) updates.countryCode = data.countryCode ?? null;
  if (data.status !== undefined) updates.status = data.status;

  if (Object.keys(updates).length === 0) {
    return getLanguage(id);
  }

  try {
    const result = await db.update(languages).set(updates).where(eq(languages.id, id));
    const affected =
      'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
    if (!affected) {
      const [exists] = await db
        .select({ id: languages.id })
        .from(languages)
        .where(eq(languages.id, id))
        .limit(1);
      if (!exists) throw httpError(404, 'NotFound', 'Language not found');
    }

    return await getLanguage(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateLanguage', 'Language code already exists.');
    }
    throw err;
  }
}

export async function deleteLanguage(id: number) {
  const result = await db.delete(languages).where(eq(languages.id, id));
  const affected =
    'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
  if (!affected) {
    const [exists] = await db
      .select({ id: languages.id })
      .from(languages)
      .where(eq(languages.id, id))
      .limit(1);
    if (!exists) return buildDeleteResponse();
    throw httpError(404, 'NotFound', 'Language not found');
  }
  return buildDeleteResponse();
}
