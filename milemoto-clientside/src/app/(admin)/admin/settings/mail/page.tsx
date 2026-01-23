'use client';

import { useMemo, useState } from 'react';

import type { UpdateMailSettingsDto } from '@milemoto/types';

import { Skeleton } from '@/features/feedback/Skeleton';
import {
  useGetMailSettings,
  useSendTestEmail,
  useUpdateMailSettings,
} from '@/hooks/useMailSettingsQueries';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/card';
import { Checkbox } from '@/ui/checkbox';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Separator } from '@/ui/separator';

function FormField({
  id,
  label,
  description,
  children,
  className,
}: {
  id: string;
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
    </div>
  );
}

export default function MailSettingsPage() {
  const { data, isLoading } = useGetMailSettings();
  const updateMutation = useUpdateMailSettings();
  const testMutation = useSendTestEmail();

  const initial = useMemo(
    () => ({
      host: data?.host ?? '',
      port: data?.port != null ? String(data.port) : '',
      username: data?.username ?? '',
      encryption: data?.encryption ?? 'tls',
      fromName: data?.fromName ?? '',
      fromEmail: data?.fromEmail ?? '',
      hasPassword: Boolean(data?.hasPassword),
    }),
    [data],
  );

  return (
    <MailSettingsForm
      key={data?.updatedAt ?? 'mail-settings'}
      initial={initial}
      isLoading={isLoading}
      updateMutation={updateMutation}
      testMutation={testMutation}
    />
  );
}

function MailSettingsForm({
  initial,
  isLoading,
  updateMutation,
  testMutation,
}: {
  initial: {
    host: string;
    port: string;
    username: string;
    encryption: 'none' | 'tls' | 'ssl';
    fromName: string;
    fromEmail: string;
    hasPassword: boolean;
  };
  isLoading: boolean;
  updateMutation: ReturnType<typeof useUpdateMailSettings>;
  testMutation: ReturnType<typeof useSendTestEmail>;
}) {
  const [host, setHost] = useState(initial.host);
  const [port, setPort] = useState(initial.port);
  const [username, setUsername] = useState(initial.username);
  const [encryption, setEncryption] = useState<'none' | 'tls' | 'ssl'>(initial.encryption);
  const [fromName, setFromName] = useState(initial.fromName);
  const [fromEmail, setFromEmail] = useState(initial.fromEmail);

  const [password, setPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);

  const [testToEmail, setTestToEmail] = useState('');

  const isDirty =
    !isLoading &&
    (host !== initial.host ||
      port !== initial.port ||
      username !== initial.username ||
      encryption !== initial.encryption ||
      fromName !== initial.fromName ||
      fromEmail !== initial.fromEmail ||
      password.trim().length > 0 ||
      clearPassword);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;

    const payload: UpdateMailSettingsDto = {};

    if (host !== initial.host) payload.host = host.trim() ? host.trim() : null;
    if (port !== initial.port) {
      const parsed = port.trim() ? Number(port) : null;
      payload.port = parsed !== null && Number.isFinite(parsed) ? parsed : null;
    }
    if (username !== initial.username) payload.username = username.trim() ? username.trim() : null;
    if (encryption !== initial.encryption) payload.encryption = encryption;
    if (fromName !== initial.fromName) payload.fromName = fromName.trim() ? fromName.trim() : null;
    if (fromEmail !== initial.fromEmail)
      payload.fromEmail = fromEmail.trim() ? fromEmail.trim() : null;

    if (clearPassword) {
      payload.password = null;
    } else if (password.trim()) {
      payload.password = password;
    }

    await updateMutation.mutateAsync(payload);
  };

  const onSendTest = async () => {
    await testMutation.mutateAsync({ toEmail: testToEmail.trim() });
  };

  return (
    <form onSubmit={onSave}>
      <Card>
        <CardHeader>
          <CardTitle>Mail</CardTitle>
          <CardDescription>Configure SMTP so the system can send emails.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-medium">SMTP Connection</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    id="host"
                    label="Mail Host"
                    description="SMTP server hostname."
                  >
                    <Input
                      id="host"
                      value={host}
                      onChange={e => setHost(e.target.value)}
                      placeholder="smtp.example.com"
                      autoComplete="off"
                    />
                  </FormField>

                  <FormField
                    id="port"
                    label="Mail Port"
                    description="Common ports: 587 (TLS) or 465 (SSL)."
                  >
                    <Input
                      id="port"
                      inputMode="numeric"
                      value={port}
                      onChange={e => setPort(e.target.value)}
                      placeholder="587"
                      autoComplete="off"
                    />
                  </FormField>

                  <FormField
                    id="username"
                    label="Mail Username"
                    description="Leave empty if not required."
                  >
                    <Input
                      id="username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="user@example.com"
                      autoComplete="username"
                    />
                  </FormField>

                  <FormField
                    id="password"
                    label="Mail Password"
                    description={
                      initial.hasPassword
                        ? 'A password is saved. Enter a new one to replace it.'
                        : 'Enter the SMTP password.'
                    }
                  >
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={initial.hasPassword ? '•••••••• (saved)' : '••••••••'}
                      autoComplete="new-password"
                    />
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Checkbox
                        id="clearPassword"
                        checked={clearPassword}
                        onCheckedChange={checked => setClearPassword(Boolean(checked))}
                      />
                      <Label htmlFor="clearPassword">Clear saved password</Label>
                    </div>
                  </FormField>

                  <FormField
                    id="encryption"
                    label="Mail Encryption"
                    description="TLS is recommended for most providers."
                  >
                    <Select
                      value={encryption}
                      onValueChange={value => setEncryption(value as 'none' | 'tls' | 'ssl')}
                    >
                      <SelectTrigger id="encryption">
                        <SelectValue placeholder="Select encryption" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tls">TLS</SelectItem>
                        <SelectItem value="ssl">SSL</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Sender Defaults</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    id="fromName"
                    label="Mail From Name"
                    description="The name recipients will see."
                  >
                    <Input
                      id="fromName"
                      value={fromName}
                      onChange={e => setFromName(e.target.value)}
                      placeholder="MileMoto"
                    />
                  </FormField>
                  <FormField
                    id="fromEmail"
                    label="Mail From Email"
                    description="The email recipients will see."
                  >
                    <Input
                      id="fromEmail"
                      type="email"
                      value={fromEmail}
                      onChange={e => setFromEmail(e.target.value)}
                      placeholder="no-reply@example.com"
                    />
                  </FormField>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Test Email</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                  <FormField
                    id="testToEmail"
                    label="Send a test email to"
                    description="Uses the settings above (saved in the database)."
                  >
                    <Input
                      id="testToEmail"
                      type="email"
                      value={testToEmail}
                      onChange={e => setTestToEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </FormField>
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        !testToEmail.trim() ||
                        testMutation.isPending ||
                        updateMutation.isPending ||
                        isLoading ||
                        isDirty
                      }
                      onClick={onSendTest}
                    >
                      {isDirty
                        ? 'Save to Test'
                        : testMutation.isPending
                          ? 'Sending...'
                          : 'Send Test'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="justify-end">
          <Button
            type="submit"
            variant="solid"
            disabled={!isDirty || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
