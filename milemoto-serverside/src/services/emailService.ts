import nodemailer from 'nodemailer';
import { eq } from 'drizzle-orm';
import { emaildeliverylogs, mailsettings } from '@milemoto/types';
import { db } from '../db/drizzle.js';
import { decryptMailFromBlob } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

type MailerCache = {
  expiresAtMs: number;
  transporter: nodemailer.Transporter;
  from: { fromName: string; fromEmail: string };
};

let mailerCache: MailerCache | null = null;
const MAIL_SETTINGS_ID = 1;
const CACHE_TTL_MS = 30_000;

async function resolveFromAddress(): Promise<{ fromName: string; fromEmail: string }> {
  const [mailRow] = await db
    .select({ fromName: mailsettings.fromName, fromEmail: mailsettings.fromEmail })
    .from(mailsettings)
    .where(eq(mailsettings.id, MAIL_SETTINGS_ID))
    .limit(1);

  if (mailRow?.fromName && mailRow?.fromEmail) {
    return { fromName: String(mailRow.fromName), fromEmail: String(mailRow.fromEmail) };
  }

  return { fromName: 'Milemoto', fromEmail: 'no-reply@example.com' };
}

async function getMailer() {
  const now = Date.now();
  if (mailerCache && mailerCache.expiresAtMs > now) return mailerCache;

  if (env.NODE_ENV === 'test') {
    const transporter = nodemailer.createTransport({ jsonTransport: true });
    const from = { fromName: 'Milemoto (test)', fromEmail: 'no-reply@example.com' };
    mailerCache = { expiresAtMs: now + CACHE_TTL_MS, transporter, from };
    return mailerCache;
  }

  const [row] = await db
    .select()
    .from(mailsettings)
    .where(eq(mailsettings.id, MAIL_SETTINGS_ID))
    .limit(1);
  if (!row) {
    throw new Error('Mail settings not configured');
  }

  const host = row.host ? String(row.host) : '';
  const port = row.port !== null && row.port !== undefined ? Number(row.port) : NaN;
  if (!host || !Number.isFinite(port)) {
    throw new Error('Mail settings not configured');
  }

  const encryption = String(row.encryption ?? 'tls') as 'none' | 'tls' | 'ssl';
  const secure = encryption === 'ssl';
  const requireTLS = encryption === 'tls';

  let password: string | undefined;
  if (row.passwordEnc) {
    try {
      password = decryptMailFromBlob(row.passwordEnc).toString('utf8');
    } catch {
      throw new Error(
        'Mail password cannot be decrypted. Re-enter the password and save mail settings.'
      );
    }
  }

  const auth =
    row.username && password ? { user: String(row.username), pass: password } : undefined;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(requireTLS ? { requireTLS: true } : {}),
    ...(auth ? { auth } : {}),
  });

  const from = await resolveFromAddress();

  mailerCache = { expiresAtMs: now + CACHE_TTL_MS, transporter, from };
  return mailerCache;
}
/**
 * Sends an email verification link.
 */
export async function sendVerificationEmail(toEmail: string, verifyUrl: string) {
  const { transporter, from } = await getMailer();
  const subject = 'Please Verify Your Email Address';
  try {
    const info = await transporter.sendMail({
      from: `"${from.fromName}" <${from.fromEmail}>`,
      to: toEmail,
      subject,
      html: ` 
        <p>Thanks for signing up for MileMoto!</p> 
        <p>Please click this link to verify your email address (link expires in 30 minutes):</p> 
        <a href="${verifyUrl}" target="_blank" style="font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 5px; background-color: #155eef; border: 1px solid #155eef; padding: 10px 20px; display: inline-block;">Verify Email</a> 
        <p style="margin-top: 20px;">Or copy and paste this URL into your browser:</p> 
        <p>${verifyUrl}</p> 
      `,
      text: `Thanks for signing up for MileMoto! Please click this link to verify your email address. This link expires in 30 minutes: ${verifyUrl}`,
    });
    await db.insert(emaildeliverylogs).values({
      provider: 'smtp',
      toEmail,
      subject,
      status: 'sent',
      messageId: info.messageId ?? null,
      response: info.response ?? null,
    });
    if (env.NODE_ENV === 'test' && info.message) {
      logger.info({ to: toEmail, preview: info.message }, 'Test email payload');
    }
    logger.info({ to: toEmail, messageId: info.messageId }, 'Verification email sent');
  } catch (emailError: unknown) {
    const err = emailError as { message?: string };
    await db.insert(emaildeliverylogs).values({
      provider: 'smtp',
      toEmail,
      subject,
      status: 'failed',
      error: err?.message ?? 'Failed to send verification email',
    });
    throw emailError;
  }
}

/**
 * Sends a password reset email.
 */
export async function sendPasswordResetEmail(toEmail: string, resetUrl: string) {
  const { transporter, from } = await getMailer();
  const subject = 'Your Password Reset Link';
  try {
    const info = await transporter.sendMail({
      from: `"${from.fromName}" <${from.fromEmail}>`,
      to: toEmail,
      subject,
      html: ` 
        <p>You requested a password reset.</p> 
        <p>Click this link to reset your password. This link expires in 30 minutes:</p> 
        <a href="${resetUrl}" target="_blank" style="font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 5px; background-color: #155eef; border: 1px solid #155eef; padding: 10px 20px; display: inline-block;">Reset Password</a> 
        <p style="margin-top: 20px;">Or copy and paste this URL into your browser:</p> 
        <p>${resetUrl}</p> 
      `,
      text: `You requested a password reset. Click this link to reset your password. This link expires in 30 minutes: ${resetUrl}`,
    });
    await db.insert(emaildeliverylogs).values({
      provider: 'smtp',
      toEmail,
      subject,
      status: 'sent',
      messageId: info.messageId ?? null,
      response: info.response ?? null,
    });
    if (env.NODE_ENV === 'test' && info.message) {
      logger.info({ to: toEmail, preview: info.message }, 'Test email payload');
    }
    logger.info({ to: toEmail, messageId: info.messageId }, 'Password reset email sent');
  } catch (emailError: unknown) {
    const err = emailError as { message?: string };
    await db.insert(emaildeliverylogs).values({
      provider: 'smtp',
      toEmail,
      subject,
      status: 'failed',
      error: err?.message ?? 'Failed to send password reset email',
    });
    throw emailError;
  }
}
