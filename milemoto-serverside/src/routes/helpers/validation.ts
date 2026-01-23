import { z } from 'zod';

export const FullNameSchema = z.string().min(2).max(191);
export const EmailSchema = z.string().email().max(191);
export const PhoneSchema = z.string().min(7).max(32);
export const LoginIdentifierSchema = z.string().min(1).max(191);
export const PasswordSchema = z.string().min(8).max(128);
export const PasswordMinSchema = z.string().min(8);

export const TokenSchema = z.string().min(10);
export const VerifyEmailTokenSchema = z.string().min(32);

export const MfaChallengeIdSchema = z.string().min(10);
export const Totp6Schema = z.string().regex(/^\d{6}$/);
export const MfaCodeSchema = z.string().min(4).max(64);
export const PhoneVerificationCodeSchema = Totp6Schema;
