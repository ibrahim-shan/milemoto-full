'use client';

import { useState } from 'react';

import { AlertCircle, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import {
  confirmPhoneVerification,
  resendVerificationEmail,
  startEmailChange,
  startPhoneVerification,
  updateProfile,
} from '@/lib/auth';
import { Button } from '@/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import { Input } from '@/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/ui/input-otp';
import { PhoneField } from '@/ui/phone-field';

function ProfileInfoSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <div className="bg-muted-foreground/20 mb-1.5 h-5 w-24 rounded" />
        <div className="bg-muted-foreground/20 h-10 w-full rounded-md" />
      </div>
      <div>
        <div className="bg-muted-foreground/20 mb-1.5 h-5 w-20 rounded" />
        <div className="bg-muted-foreground/20 h-10 w-full rounded-md" />
      </div>
      <div>
        <div className="bg-muted-foreground/20 mb-1.5 h-5 w-32 rounded" />
        <div className="bg-muted-foreground/20 h-10 w-full rounded-md" />
      </div>
    </div>
  );
}

export function ProfileInfo() {
  const { user, loading, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [phoneValid, setPhoneValid] = useState(true);
  const [pendingEmail, setPendingEmail] = useState(user?.pendingEmail || null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  if (loading) {
    return <ProfileInfoSkeleton />;
  }

  if (!user) {
    return <p>Could not load user data.</p>;
  }

  const normalizedPhone = phone.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const isDirty =
    fullName.trim() !== (user.fullName || '').trim() ||
    normalizedPhone !== (user.phone || '').trim() ||
    normalizedEmail !== (user.email || '').trim().toLowerCase();
  const phoneVerified = Boolean(user.phoneVerifiedAt);
  const pendingEmailDisplay = pendingEmail ?? user.pendingEmail ?? null;

  const onCancel = () => {
    setEditing(false);
    setFullName(user.fullName);
    setEmail(user.email);
    setPhone(user.phone || '');
    setPhoneValid(true);
    setPendingEmail(user.pendingEmail || null);
  };

  const sendVerificationCode = async () => {
    if (!user.phone) {
      toast.error('Add a phone number before verifying it.');
      return;
    }
    setSendingCode(true);
    try {
      await startPhoneVerification();
      toast.success('SMS sent to your phone number.');
      setVerifyOpen(true);
    } catch (e: unknown) {
      const msg: string = (e as { message?: string })?.message || '';
      toast.error(msg || 'Failed to send verification code.');
    } finally {
      setSendingCode(false);
    }
  };

  const confirmCode = async () => {
    if (!verificationCode.trim()) {
      toast.error('Enter the 6-digit code.');
      return;
    }
    setVerifyingCode(true);
    try {
      const result = await confirmPhoneVerification(verificationCode.trim());
      const verifiedAt = result.phoneVerifiedAt ?? new Date().toISOString();
      updateUser(prev => (prev ? { ...prev, phoneVerifiedAt: verifiedAt } : prev));
      toast.success('Phone number verified.');
      setVerifyOpen(false);
      setVerificationCode('');
    } catch (e: unknown) {
      const msg: string = (e as { message?: string })?.message || '';
      toast.error(msg || 'Invalid verification code.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const resendEmailVerification = async () => {
    if (!pendingEmailDisplay) return;
    setResendingEmail(true);
    try {
      await resendVerificationEmail(pendingEmailDisplay);
      toast.success('Verification email resent.');
    } catch (e: unknown) {
      const msg: string = (e as { message?: string })?.message || '';
      toast.error(msg || 'Failed to resend verification email.');
    } finally {
      setResendingEmail(false);
    }
  };

  const onSave = async () => {
    if (!isDirty) {
      toast.info('No changes to update.');
      setEditing(false);
      return;
    }
    if (!fullName.trim()) {
      toast.error('Full Name is required.');
      return;
    }
    if (!normalizedEmail) {
      toast.error('Email is required.');
      return;
    }
    if (normalizedPhone && !phoneValid) {
      toast.error('Please enter a valid phone number for the selected country.');
      return;
    }
    const emailDirty = normalizedEmail !== (user.email || '').trim().toLowerCase();
    const phoneDirty = normalizedPhone !== (user.phone || '').trim();
    setSaving(true);
    try {
      const profileDirty = fullName.trim() !== (user.fullName || '').trim() || phoneDirty;

      if (profileDirty) {
        const updated = await updateProfile({
          fullName: fullName.trim(),
          phone: normalizedPhone || null,
        });
        updateUser(() => updated);
        if (phoneDirty && normalizedPhone) {
          setVerifyOpen(true);
        }
      }

      if (emailDirty) {
        await startEmailChange(normalizedEmail);
        setPendingEmail(normalizedEmail);
        updateUser(prev => (prev ? { ...prev, pendingEmail: normalizedEmail } : prev));
        toast.success('Verification email sent to your new address.');
      } else if (profileDirty) {
        toast.success('Profile updated');
      }

      setEditing(false);
    } catch (e: unknown) {
      const status = (e as { status: number })?.status;
      const msg: string = (e as { message: string })?.message || '';
      const code = (e as { code: string })?.code || (e as { error: string })?.error;
      const dup =
        status === 409 ||
        (typeof msg === 'string' && /duplicate|already\s+exists|ER_DUP_ENTRY/i.test(msg)) ||
        (typeof code === 'string' && /duplicate|ER_DUP_ENTRY/i.test(code));
      if (dup && emailDirty) {
        toast.error('Email address is already in use.');
      } else if (dup && normalizedPhone) {
        toast.error('Phone number is already in use.');
      } else {
        toast.error(msg || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <label
          htmlFor={editing ? 'profile-full-name' : undefined}
          className="text-muted-foreground mb-1.5 block text-sm font-medium"
        >
          Full Name
        </label>
        {editing ? (
          <Input
            type="text"
            id="profile-full-name"
            className="border-border bg-background text-foreground h-10 w-full rounded-md border px-3 py-2 text-sm outline-none"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            autoComplete="name"
          />
        ) : (
          <div className="border-border bg-background flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm">
            {user.fullName}
          </div>
        )}
      </div>

      <div>
        <label
          htmlFor={editing ? 'profile-email' : undefined}
          className="text-muted-foreground mb-1.5 block text-sm font-medium"
        >
          Email
        </label>
        {editing ? (
          <Input
            type="email"
            id="profile-email"
            className="border-border bg-background text-foreground h-10 w-full rounded-md border px-3 py-2 text-sm outline-none"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
        ) : (
          <div className="border-border bg-background flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm">
            {user.email}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm text-emerald-700">
        <BadgeCheck
          className="h-4 w-4"
          aria-hidden
        />
        <span className="font-medium">Email Verified</span>
      </div>
      {pendingEmailDisplay ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-amber-700">
          <AlertCircle
            className="h-4 w-4"
            aria-hidden
          />
          <span className="font-medium">
            Pending email change to {pendingEmailDisplay}. Check your inbox to verify.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={resendEmailVerification}
            disabled={resendingEmail}
          >
            {resendingEmail ? 'Sending...' : 'Resend email'}
          </Button>
        </div>
      ) : null}

      <div>
        {editing ? (
          <PhoneField
            id="profile-phone"
            label="Phone Number"
            value={phone}
            onChange={(nextValue, meta) => {
              setPhone(nextValue);
              setPhoneValid(meta.isValid || !nextValue);
            }}
          />
        ) : (
          <>
            <p className="text-muted-foreground mb-1.5 block text-sm font-medium">Phone Number</p>
            <div className="border-border bg-background flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm">
              {user.phone || <span className="text-muted-foreground">Not set</span>}
            </div>
          </>
        )}
      </div>
      {user.phone ? (
        phoneVerified ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <BadgeCheck
              className="h-4 w-4"
              aria-hidden
            />
            <span className="font-medium">Phone verified</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-sm text-amber-700">
            <div className="flex items-center gap-2">
              <AlertCircle
                className="h-4 w-4"
                aria-hidden
              />
              <span className="font-medium">Phone not verified</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={sendVerificationCode}
              disabled={sendingCode}
            >
              {sendingCode ? 'Sending...' : 'Verify phone'}
            </Button>
          </div>
        )
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        {!editing ? (
          <Button
            variant="outline"
            onClick={() => {
              setEditing(true);
              setFullName(user.fullName);
              setPhone(user.phone || '');
              setPhoneValid(true);
            }}
          >
            Edit Profile
          </Button>
        ) : (
          <>
            <Button
              variant="solid"
              justify="center"
              onClick={onSave}
              disabled={saving || !isDirty}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          </>
        )}
      </div>

      <Dialog
        open={verifyOpen}
        onOpenChange={open => {
          setVerifyOpen(open);
          if (!open) {
            setVerificationCode('');
            setVerifyingCode(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify phone number</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code sent to <span className="font-medium">{user.phone}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <InputOTP
              maxLength={6}
              value={verificationCode}
              onChange={setVerificationCode}
              inputMode="numeric"
              containerClassName="justify-center"
              className="gap-2"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSeparator />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <div className="text-muted-foreground text-center text-xs">
              Didn’t receive a code?{' '}
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={sendVerificationCode}
                disabled={sendingCode}
              >
                {sendingCode ? 'Sending...' : 'Resend code'}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="solid"
              justify="center"
              onClick={confirmCode}
              disabled={verifyingCode || verificationCode.trim().length !== 6}
            >
              {verifyingCode ? 'Verifying...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
