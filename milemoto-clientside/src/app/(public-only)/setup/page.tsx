'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { get, post } from '@/lib/api';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';

type SetupStatus = { installed: boolean };
type SetupInitBody = { fullName: string; email: string; password: string };

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await get<SetupStatus>('/setup/status');
        if (!mounted) return;
        if (status.installed) {
          router.replace('/signin');
          return;
        }
      } catch {
        // If status check fails, still allow showing the form to surface the next error on submit.
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== password2) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await post<{ ok: true }>('/setup/initialize', {
        fullName,
        email,
        password,
      } satisfies SetupInitBody);

      toast.success('Setup completed. You can now sign in.');
      router.replace('/signin');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Setting up…</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Checking installation status…
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Initial Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="fullName">Admin Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Super Admin"
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@yourstore.com"
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={8}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password2">Confirm Password</Label>
              <Input
                id="password2"
                type="password"
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                minLength={8}
                required
                disabled={submitting}
              />
            </div>

            <Button
              type="submit"
              variant="solid"
              isLoading={submitting}
              disabled={submitting}
            >
              Create Admin & Finish Setup
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
