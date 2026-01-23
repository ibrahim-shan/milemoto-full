import { ensureMailSettingsRow, formatMailSettingsRow } from './shared.js';

export async function getMailSettings() {
  const row = await ensureMailSettingsRow();
  return formatMailSettingsRow(row);
}
