// src/app/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Mail, Phone } from 'lucide-react';

import { forgotPassword, forgotPasswordByPhone } from '@/lib/auth';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { PhoneField } from '@/ui/phone-field';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(true);
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || success) return; // Don't submit twice
    setError(null);
    setLoading(true);

    try {
      if (method === 'email') {
        await forgotPassword(email);
      } else {
        if (phone && !phoneValid) {
          setError('Please enter a valid phone number for the selected country.');
          return;
        }
        await forgotPasswordByPhone(phone);
      }
      setSuccess(true); // Show success message
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-background text-foreground mx-auto grid min-h-dvh max-w-7xl place-items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-border bg-card w-full max-w-md rounded-2xl border p-6 shadow-sm md:p-8">
        {success ? (
          // --- VIEW 2: SUCCESS MESSAGE ---
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {method === 'email' ? 'Check your email' : 'Check your SMS'}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              If an account exists, we&apos;ve sent a reset link to your{' '}
              {method === 'email' ? 'email' : 'phone'}.
            </p>
          </div>
        ) : (
          // --- VIEW 1: THE FORM ---
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Forgot Password</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Choose how you want to receive your reset link.
            </p>

            <form
              onSubmit={onSubmit}
              className="mt-6 space-y-4"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMethod('email')}
                  className={`border-border rounded-md border px-3 py-2 text-left text-sm font-medium ${
                    method === 'email'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('phone')}
                  className={`border-border rounded-md border px-3 py-2 text-left text-sm font-medium ${
                    method === 'phone'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    SMS
                  </span>
                </button>
              </div>

              {method === 'email' ? (
                <div className="relative">
                  <Mail
                    aria-hidden
                    className="text-muted-foreground pointer-events-none absolute left-3 top-2.5 h-4 w-4"
                  />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required={method === 'email'}
                    autoComplete="email"
                    placeholder=" "
                    dir="ltr"
                    className="border-input bg-background text-foreground ring-ring/0 peer w-full rounded-md border px-9 py-2 text-sm outline-none placeholder:text-transparent focus-visible:ring-2"
                  />
                  <label
                    htmlFor="email"
                    className="text-muted-foreground pointer-events-none absolute left-9 top-2.5 px-1 text-sm transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-sm peer-focus:-top-2 peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:text-xs"
                  >
                    Email
                  </label>
                </div>
              ) : (
                <PhoneField
                  id="reset-phone"
                  label="Phone Number"
                  value={phone}
                  onChange={(nextValue, meta) => {
                    setPhone(nextValue);
                    setPhoneValid(meta.isValid || !nextValue);
                  }}
                />
              )}

              {error && (
                <p
                  role="alert"
                  className="text-error text-sm"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="solid"
                className="mt-2"
                size="md"
                justify="center"
                fullWidth
                isLoading={loading}
              >
                Send Reset Link
              </Button>
            </form>

            <p className="text-muted-foreground mt-6 text-center text-sm">
              Remembered your password?{' '}
              <Link
                href="/signin"
                className="text-primary underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
