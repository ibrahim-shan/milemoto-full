// Shared DTO types

export type UserDto = {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  phoneVerifiedAt?: string | null;
  pendingEmail?: string | null;
  role: "user" | "admin";
  status: "active" | "inactive" | "blocked";
  mfaEnabled?: boolean;
};

export type UserAuthData = {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: "user" | "admin";
  status: "active" | "inactive" | "blocked";
  mfaEnabled: 0 | 1;
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
};

export type AuthOutputDto = {
  accessToken: string;
  user: UserDto;
};

export type MfaChallengeDto = {
  mfaRequired: true;
  challengeId: string;
  method: string; // e.g. 'totpOrBackup'
  expiresAt: string; // ISO string
};

export type RefreshResponseDto = { accessToken: string };
export type OkResponseDto = { ok: true };
export type RegisterResponseDto = { ok: true; userId: number };

export type MfaSetupStartResponseDto = {
  challengeId: string;
  secretBase32: string;
  otpauthUrl: string;
  expiresAt: string;
};

export type MfaSetupVerifyResponseDto = {
  ok: true;
  backupCodes: string[];
};

export type MfaBackupCodesResponseDto = {
  ok: true;
  backupCodes: string[];
};
