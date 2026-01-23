export type OAuthExchangeResult = { ok: true; idToken: string } | { ok: false; message: string };

export type VerifiedGoogleIdentity = {
  gsub: string;
  email: string;
  name: string;
  verifiedAt: Date | null;
};

export type OAuthVerifyResult =
  | { ok: true; identity: VerifiedGoogleIdentity }
  | { ok: false; message: string };
