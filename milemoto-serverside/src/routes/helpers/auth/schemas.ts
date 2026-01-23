import { z } from 'zod';
import {
  EmailSchema,
  FullNameSchema,
  MfaCodeSchema,
  PasswordMinSchema,
  PasswordSchema,
  PhoneSchema,
  VerifyEmailTokenSchema,
  LoginIdentifierSchema,
  PhoneVerificationCodeSchema,
} from '../validation.js';

// --- Zod Schemas ---
export const Register = z.object({
  fullName: FullNameSchema,
  email: EmailSchema,
  phone: PhoneSchema.optional(),
  password: PasswordSchema,
  remember: z.coerce.boolean().optional().default(false),
});

export const ChangePassword = z.object({
  oldPassword: PasswordMinSchema,
  newPassword: PasswordSchema,
});

export const UpdateProfile = z.object({
  fullName: FullNameSchema,
  phone: z.union([PhoneSchema, z.null()]).optional(),
});

export const DisableMfa = z.object({
  password: PasswordMinSchema,
  code: MfaCodeSchema,
  rememberDevice: z.boolean().optional().default(false),
});

export const VerifyEmail = z.object({
  token: VerifyEmailTokenSchema,
});

export const ResendVerification = z.object({
  email: EmailSchema,
});

export const VerifyPhoneCode = z.object({
  code: PhoneVerificationCodeSchema,
});

export const Login = z.preprocess(
  (value) => {
    if (!value || typeof value !== 'object') return value;
    const obj = value as Record<string, unknown>;
    if (typeof obj.identifier === 'string') return value;
    if (typeof obj.email === 'string') {
      return { ...obj, identifier: obj.email };
    }
    if (typeof obj.phone === 'string') {
      return { ...obj, identifier: obj.phone };
    }
    return value;
  },
  z.object({
    identifier: LoginIdentifierSchema,
    password: PasswordMinSchema,
    remember: z.coerce.boolean().optional().default(false),
  })
);
