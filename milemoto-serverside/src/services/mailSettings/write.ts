import nodemailer from 'nodemailer';
import { eq } from 'drizzle-orm';
import { emaildeliverylogs, mailsettings } from '@milemoto/types';
import type { SendTestEmailDto, UpdateMailSettingsDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { decryptMailFromBlob, encryptMailToBlob } from '../../utils/crypto.js';
import { env } from '../../config/env.js';
import {
  ensureMailSettingsRow,
  formatMailSettingsRow,
  MAIL_SETTINGS_SINGLETON_ID,
} from './shared.js';

async function resolveFromAddress(): Promise<{ fromName: string; fromEmail: string }> {
  const [mailRow] = await db
    .select({ fromName: mailsettings.fromName, fromEmail: mailsettings.fromEmail })
    .from(mailsettings)
    .where(eq(mailsettings.id, MAIL_SETTINGS_SINGLETON_ID))
    .limit(1);

  if (mailRow?.fromName && mailRow?.fromEmail) {
    return { fromName: String(mailRow.fromName), fromEmail: String(mailRow.fromEmail) };
  }

  return { fromName: 'Milemoto', fromEmail: 'no-reply@example.com' };
}

async function buildTransport() {
  if (env.NODE_ENV === 'test') {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  const [row] = await db
    .select()
    .from(mailsettings)
    .where(eq(mailsettings.id, MAIL_SETTINGS_SINGLETON_ID))
    .limit(1);
  if (!row) throw httpError(404, 'SettingsNotFound', 'Mail settings not found');

  const host = row.host ? String(row.host) : '';
  const port = row.port !== null && row.port !== undefined ? Number(row.port) : NaN;
  if (!host || !Number.isFinite(port)) {
    throw httpError(400, 'MailNotConfigured', 'Mail host and port must be configured');
  }

  const encryption = String(row.encryption ?? 'tls') as 'none' | 'tls' | 'ssl';
  const secure = encryption === 'ssl';
  const requireTLS = encryption === 'tls';

  let password: string | undefined;
  if (row.passwordEnc) {
    try {
      password = decryptMailFromBlob(row.passwordEnc).toString('utf8');
    } catch {
      throw httpError(
        400,
        'MailPasswordInvalid',
        'Saved mail password cannot be decrypted. Re-enter the password and save mail settings.'
      );
    }
  }

  const auth =
    row.username && password ? { user: String(row.username), pass: password } : undefined;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    ...(requireTLS ? { requireTLS: true } : {}),
    ...(auth ? { auth } : {}),
  });
}

export async function updateMailSettings(data: UpdateMailSettingsDto) {
  await ensureMailSettingsRow();

  const updates: Partial<typeof mailsettings.$inferInsert> = {};

  if (data.host !== undefined) updates.host = data.host ?? null;
  if (data.port !== undefined) updates.port = data.port ?? null;
  if (data.username !== undefined) updates.username = data.username ?? null;
  if (data.encryption !== undefined) updates.encryption = data.encryption;
  if (data.fromName !== undefined) updates.fromName = data.fromName ?? null;
  if (data.fromEmail !== undefined) updates.fromEmail = data.fromEmail ?? null;

  if (data.password !== undefined) {
    if (data.password === null) {
      updates.passwordEnc = null;
    } else {
      const enc = encryptMailToBlob(Buffer.from(String(data.password), 'utf8'));
      updates.passwordEnc = enc;
    }
  }

  if (Object.keys(updates).length === 0) {
    const current = await ensureMailSettingsRow();
    return formatMailSettingsRow(current);
  }

  await db.update(mailsettings).set(updates).where(eq(mailsettings.id, MAIL_SETTINGS_SINGLETON_ID));
  const row = await ensureMailSettingsRow();
  return formatMailSettingsRow(row);
}

export async function sendTestEmail(data: SendTestEmailDto): Promise<{ ok: true }> {
  const transport = await buildTransport();
  const from = await resolveFromAddress();
  const subject = 'Test Email (Milemoto)';

  try {
    const info = await transport.sendMail({
      from: `"${from.fromName}" <${from.fromEmail}>`,
      to: data.toEmail,
      subject,
      text: 'This is a test email to confirm your SMTP settings are working.',
      html: '<p>This is a test email to confirm your SMTP settings are working.</p>',
    });
    await db.insert(emaildeliverylogs).values({
      provider: 'smtp',
      toEmail: data.toEmail,
      subject,
      status: 'sent',
      messageId: info.messageId ?? null,
      response: info.response ?? null,
    });
  } catch (e: unknown) {
    const err = e as { message?: string; response?: string; responseCode?: number; code?: string };
    const hint =
      err?.response ||
      err?.message ||
      'SMTP rejected the message. Check host/port/encryption, credentials, and From Email.';

    await db.insert(emaildeliverylogs).values({
      provider: 'smtp',
      toEmail: data.toEmail,
      subject,
      status: 'failed',
      error: hint,
    });

    throw httpError(400, 'MailSendFailed', `Failed to send test email: ${hint}`);
  }

  return { ok: true };
}
