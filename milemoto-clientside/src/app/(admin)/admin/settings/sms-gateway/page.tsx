'use client';

import { useMemo, useState } from 'react';

import { useLocalizationFormat } from '@/hooks/useLocalizationFormat';
import {
  useActivateSmsGateway,
  useCreateSmsGateway,
  useGetSmsDeliveryReports,
  useGetSmsGateways,
  useSendTestSms,
  useSendTestWhatsapp,
  useUpdateSmsGateway,
} from '@/hooks/useSmsGatewayQueries';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { Checkbox } from '@/ui/checkbox';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Separator } from '@/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';

type DeliveryReport = {
  id: number;
  provider: string;
  messageId: string;
  toNumber: string;
  statusGroup: string | null;
  statusName: string | null;
  statusDescription: string | null;
  errorName: string | null;
  errorDescription: string | null;
  sentAt: string | null;
  doneAt: string | null;
  receivedAt: string;
};

type GatewayKey = 'infobip';

type GatewayConfig = {
  id: GatewayKey;
  name: string;
  description: string;
  fields: Array<{ key: string; label: string; placeholder?: string; type?: string }>;
};

type GatewayRow = {
  id: number;
  provider: string;
  name: string;
  status: 'active' | 'inactive';
  baseUrl: string | null;
  senderId: string | null;
  smsSenderVerified: boolean;
  whatsappSenderId: string | null;
  whatsappSenderVerified: boolean;
  whatsappTemplateName: string | null;
  whatsappLanguage: string | null;
  hasApiKey: boolean;
};

type SenderVerificationState = {
  sms: boolean;
  whatsapp: boolean;
};

type SeedState = {
  activeGateway: GatewayKey | null;
  configs: Record<GatewayKey, Record<string, string>>;
  savedApiKeys: Record<GatewayKey, boolean>;
  senderVerified: Record<GatewayKey, SenderVerificationState>;
  seedKey: string;
};

const gateways: GatewayConfig[] = [
  {
    id: 'infobip',
    name: 'Infobip',
    description: 'Infobip SMS gateway with API key and sender configuration.',
    fields: [
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://api.infobip.com' },
      { key: 'apiKey', label: 'API Key', placeholder: '********', type: 'password' },
      { key: 'senderId', label: 'SMS Sender ID', placeholder: 'MileMoto' },
      { key: 'whatsappSenderId', label: 'WhatsApp Sender', placeholder: '447860088970' },
      {
        key: 'whatsappTemplateName',
        label: 'WhatsApp Template',
        placeholder: 'test_whatsapp_template_en',
      },
      { key: 'whatsappLanguage', label: 'WhatsApp Language', placeholder: 'en' },
    ],
  },
];

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

function buildSeed(gatewayRows: GatewayRow[]): SeedState {
  const activeRow = gatewayRows.find(row => row.status === 'active');
  const activeGateway = activeRow?.provider ? (activeRow.provider as GatewayKey) : null;

  const configs: Record<GatewayKey, Record<string, string>> = {
    infobip: {
      baseUrl: '',
      apiKey: '',
      senderId: '',
      whatsappSenderId: '',
      whatsappTemplateName: '',
      whatsappLanguage: 'en',
    },
  };

  const savedApiKeys: Record<GatewayKey, boolean> = {
    infobip: false,
  };

  const senderVerified: Record<GatewayKey, SenderVerificationState> = {
    infobip: { sms: false, whatsapp: false },
  };

  gatewayRows.forEach(row => {
    const provider = row.provider as GatewayKey;
    if (!configs[provider]) return;
    configs[provider] = {
      baseUrl: row.baseUrl ?? '',
      apiKey: '',
      senderId: row.senderId ?? '',
      whatsappSenderId: row.whatsappSenderId ?? '',
      whatsappTemplateName: row.whatsappTemplateName ?? '',
      whatsappLanguage: row.whatsappLanguage ?? 'en',
    };
    savedApiKeys[provider] = row.hasApiKey;
    senderVerified[provider] = {
      sms: Boolean(row.smsSenderVerified),
      whatsapp: Boolean(row.whatsappSenderVerified),
    };
  });

  const seedKey = gatewayRows
    .map(
      row =>
        `${row.id}:${row.status}:${row.baseUrl ?? ''}:${row.senderId ?? ''}:${row.smsSenderVerified}:${row.whatsappSenderId ?? ''}:${row.whatsappSenderVerified}:${row.whatsappTemplateName ?? ''}:${row.whatsappLanguage ?? ''}:${row.hasApiKey}`,
    )
    .join('|');

  return { activeGateway, configs, savedApiKeys, senderVerified, seedKey };
}

function SmsGatewayForm({
  seed,
  gatewaysList,
  gatewayRows,
  isLoading,
  createGateway,
  updateGateway,
  activateGateway,
  sendTestSms,
  sendTestWhatsapp,
  reports,
  reportsLoading,
  formatDateTime,
}: {
  seed: SeedState;
  gatewaysList: GatewayConfig[];
  gatewayRows: GatewayRow[];
  isLoading: boolean;
  createGateway: ReturnType<typeof useCreateSmsGateway>;
  updateGateway: ReturnType<typeof useUpdateSmsGateway>;
  activateGateway: ReturnType<typeof useActivateSmsGateway>;
  sendTestSms: ReturnType<typeof useSendTestSms>;
  sendTestWhatsapp: ReturnType<typeof useSendTestWhatsapp>;
  reports: DeliveryReport[];
  reportsLoading: boolean;
  formatDateTime: (value: string | Date | null | undefined) => string;
}) {
  const [activeGateway] = useState<GatewayKey | null>(seed.activeGateway);
  const [configs, setConfigs] = useState<Record<GatewayKey, Record<string, string>>>(seed.configs);
  const [savedApiKeys] = useState<Record<GatewayKey, boolean>>(seed.savedApiKeys);
  const [senderVerified, setSenderVerified] = useState<Record<GatewayKey, SenderVerificationState>>(
    seed.senderVerified,
  );
  const [clearApiKeys, setClearApiKeys] = useState<Record<GatewayKey, boolean>>({
    infobip: false,
  });

  const activeGatewayName = useMemo(() => {
    if (!activeGateway) return 'None';
    return gatewaysList.find(g => g.id === activeGateway)?.name ?? 'SMS Gateway';
  }, [activeGateway, gatewaysList]);

  const gatewayByProvider = useMemo(() => {
    const map = new Map<GatewayKey, GatewayRow>();
    gatewayRows.forEach(row => {
      map.set(row.provider as GatewayKey, row);
    });
    return map;
  }, [gatewayRows]);

  const handleFieldChange = (gatewayId: GatewayKey, key: string, value: string) => {
    setConfigs(prev => ({
      ...prev,
      [gatewayId]: {
        ...prev[gatewayId],
        [key]: value,
      },
    }));
  };

  const handleSaveGateway = async (gatewayId: GatewayKey) => {
    const config = configs[gatewayId] ?? {};
    const baseUrl = config.baseUrl?.trim() || '';
    const senderId = config.senderId?.trim() || '';
    const whatsappSenderId = config.whatsappSenderId?.trim() || '';
    const whatsappTemplateName = config.whatsappTemplateName?.trim() || '';
    const whatsappLanguage = config.whatsappLanguage?.trim() || '';
    const apiKey = config.apiKey?.trim() || '';
    const smsSenderVerified = senderVerified[gatewayId]?.sms ?? false;
    const whatsappSenderVerified = senderVerified[gatewayId]?.whatsapp ?? false;
    const existing = gatewayByProvider.get(gatewayId);
    const clearKey = clearApiKeys[gatewayId];

    const hasAnyValue = Boolean(
      baseUrl ||
      senderId ||
      whatsappSenderId ||
      whatsappTemplateName ||
      whatsappLanguage ||
      apiKey ||
      existing ||
      clearKey,
    );
    if (!hasAnyValue) return;

    if (existing) {
      await updateGateway.mutateAsync({
        id: existing.id,
        data: {
          name: existing.name,
          baseUrl: baseUrl || null,
          senderId: senderId || null,
          smsSenderVerified,
          whatsappSenderId: whatsappSenderId || null,
          whatsappSenderVerified,
          whatsappTemplateName: whatsappTemplateName || null,
          whatsappLanguage: whatsappLanguage || null,
          ...(clearKey ? { apiKey: null } : apiKey ? { apiKey } : {}),
        },
      });
    } else {
      await createGateway.mutateAsync({
        provider: gatewayId,
        name: gatewaysList.find(g => g.id === gatewayId)?.name ?? gatewayId,
        baseUrl: baseUrl || null,
        senderId: senderId || null,
        smsSenderVerified,
        whatsappSenderId: whatsappSenderId || null,
        whatsappSenderVerified,
        whatsappTemplateName: whatsappTemplateName || null,
        whatsappLanguage: whatsappLanguage || null,
        ...(clearKey ? { apiKey: null } : apiKey ? { apiKey } : {}),
      });
    }

    if (apiKey || clearKey) {
      setConfigs(prev => ({
        ...prev,
        [gatewayId]: {
          ...prev[gatewayId],
          apiKey: '',
        },
      }));
      setClearApiKeys(prev => ({
        ...prev,
        [gatewayId]: false,
      }));
    }
  };

  const [testToNumber, setTestToNumber] = useState('');
  const [testWhatsappNumber, setTestWhatsappNumber] = useState('');
  const [testWhatsappName, setTestWhatsappName] = useState('');

  const handleSendTest = async () => {
    await sendTestSms.mutateAsync({
      toNumber: testToNumber.trim(),
    });
  };

  const handleSendWhatsappTest = async () => {
    await sendTestWhatsapp.mutateAsync({
      toNumber: testWhatsappNumber.trim(),
      placeholder: testWhatsappName.trim() || 'Test',
    });
  };

  const handleActivate = async (gatewayId: GatewayKey) => {
    const existing = gatewayByProvider.get(gatewayId);
    if (existing) {
      await activateGateway.mutateAsync(existing.id);
      return;
    }

    const config = configs[gatewayId] ?? {};
    const created = await createGateway.mutateAsync({
      provider: gatewayId,
      name: gatewaysList.find(g => g.id === gatewayId)?.name ?? gatewayId,
      baseUrl: config.baseUrl?.trim() || null,
      senderId: config.senderId?.trim() || null,
      whatsappSenderId: config.whatsappSenderId?.trim() || null,
      whatsappTemplateName: config.whatsappTemplateName?.trim() || null,
      whatsappLanguage: config.whatsappLanguage?.trim() || null,
      ...(config.apiKey?.trim() ? { apiKey: config.apiKey.trim() } : {}),
    });

    await activateGateway.mutateAsync(created.id);
  };

  const isGatewayDirty = (gatewayId: GatewayKey) => {
    const config = configs[gatewayId] ?? {};
    const baseUrl = config.baseUrl?.trim() || '';
    const senderId = config.senderId?.trim() || '';
    const whatsappSenderId = config.whatsappSenderId?.trim() || '';
    const whatsappTemplateName = config.whatsappTemplateName?.trim() || '';
    const whatsappLanguage = config.whatsappLanguage?.trim() || '';
    const apiKey = config.apiKey?.trim() || '';
    const smsSenderVerified = senderVerified[gatewayId]?.sms ?? false;
    const whatsappSenderVerified = senderVerified[gatewayId]?.whatsapp ?? false;
    const existing = gatewayByProvider.get(gatewayId);
    const clearKey = clearApiKeys[gatewayId];

    if (!existing) {
      return Boolean(
        baseUrl ||
        senderId ||
        whatsappSenderId ||
        whatsappTemplateName ||
        whatsappLanguage ||
        apiKey ||
        clearKey,
      );
    }

    const savedBaseUrl = existing.baseUrl ?? '';
    const savedSenderId = existing.senderId ?? '';
    const savedSmsSenderVerified = Boolean(existing.smsSenderVerified);
    const savedWhatsappSenderId = existing.whatsappSenderId ?? '';
    const savedWhatsappSenderVerified = Boolean(existing.whatsappSenderVerified);
    const savedWhatsappTemplateName = existing.whatsappTemplateName ?? '';
    const savedWhatsappLanguage = existing.whatsappLanguage ?? '';
    const baseChanged = baseUrl !== savedBaseUrl;
    const senderChanged = senderId !== savedSenderId;
    const senderVerifiedChanged = smsSenderVerified !== savedSmsSenderVerified;
    const whatsappSenderChanged = whatsappSenderId !== savedWhatsappSenderId;
    const whatsappSenderVerifiedChanged = whatsappSenderVerified !== savedWhatsappSenderVerified;
    const whatsappTemplateChanged = whatsappTemplateName !== savedWhatsappTemplateName;
    const whatsappLanguageChanged = whatsappLanguage !== savedWhatsappLanguage;
    const keyChanged = Boolean(apiKey);

    return (
      baseChanged ||
      senderChanged ||
      senderVerifiedChanged ||
      whatsappSenderChanged ||
      whatsappSenderVerifiedChanged ||
      whatsappTemplateChanged ||
      whatsappLanguageChanged ||
      keyChanged ||
      clearKey
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS Gateway</CardTitle>
        <CardDescription>Configure the SMS gateway used for sending messages.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Gateways</h3>
          <p className="text-muted-foreground text-sm">
            Configure each gateway. Only one can be active at a time.
          </p>
          <p className="text-muted-foreground text-sm">
            Active gateway: <span className="text-foreground font-medium">{activeGatewayName}</span>
          </p>
        </div>

        <Separator />

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-24 rounded-lg border border-dashed"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {gatewaysList.map(gateway => {
              const isActive = activeGateway === gateway.id;
              const hasSavedKey = savedApiKeys[gateway.id];
              return (
                <div
                  key={gateway.id}
                  className={cn(
                    'rounded-lg border p-4',
                    isActive ? 'border-primary/60 bg-primary/5' : 'border-border',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium">
                        {gateway.name}{' '}
                        {isActive ? (
                          <span className="bg-primary/10 text-primary ml-2 rounded-full px-2 py-0.5 text-xs">
                            Active
                          </span>
                        ) : null}
                      </h3>
                      <p className="text-muted-foreground text-sm">{gateway.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={isActive ? 'solid' : 'outline'}
                        size="sm"
                        onClick={() => handleActivate(gateway.id)}
                        disabled={isActive || activateGateway.isPending}
                      >
                        {isActive ? 'Active' : 'Activate'}
                      </Button>
                      <Button
                        type="button"
                        variant="solid"
                        size="sm"
                        onClick={() => handleSaveGateway(gateway.id)}
                        disabled={
                          createGateway.isPending ||
                          updateGateway.isPending ||
                          !isGatewayDirty(gateway.id)
                        }
                      >
                        Save
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                    {gateway.fields.map(field => {
                      const id = `${gateway.id}-${field.key}`;
                      const isApiKey = field.key === 'apiKey';
                      const isSmsSender = field.key === 'senderId';
                      const isWhatsappSender = field.key === 'whatsappSenderId';
                      const description =
                        isApiKey && hasSavedKey
                          ? 'An API key is saved. Enter a new one to replace it.'
                          : '';
                      const placeholder =
                        isApiKey && hasSavedKey ? '******** (saved)' : field.placeholder;
                      return (
                        <FormField
                          key={id}
                          id={id}
                          label={field.label}
                          {...(description ? { description } : {})}
                        >
                          <Input
                            id={id}
                            type={field.type ?? 'text'}
                            value={configs[gateway.id]?.[field.key] ?? ''}
                            onChange={e => handleFieldChange(gateway.id, field.key, e.target.value)}
                            placeholder={placeholder}
                            autoComplete="off"
                            {...(isWhatsappSender ? { numeric: 'phone' } : {})}
                          />
                          {isSmsSender ? (
                            <div className="mt-2 flex items-center gap-2 text-sm">
                              <Checkbox
                                id={`${gateway.id}-sms-verified`}
                                checked={senderVerified[gateway.id]?.sms ?? false}
                                onCheckedChange={checked =>
                                  setSenderVerified(prev => ({
                                    ...prev,
                                    [gateway.id]: {
                                      ...prev[gateway.id],
                                      sms: Boolean(checked),
                                    },
                                  }))
                                }
                              />
                              <Label htmlFor={`${gateway.id}-sms-verified`}>
                                Mark SMS sender as verified
                              </Label>
                            </div>
                          ) : null}
                          {isWhatsappSender ? (
                            <div className="mt-2 flex items-center gap-2 text-sm">
                              <Checkbox
                                id={`${gateway.id}-whatsapp-verified`}
                                checked={senderVerified[gateway.id]?.whatsapp ?? false}
                                onCheckedChange={checked =>
                                  setSenderVerified(prev => ({
                                    ...prev,
                                    [gateway.id]: {
                                      ...prev[gateway.id],
                                      whatsapp: Boolean(checked),
                                    },
                                  }))
                                }
                              />
                              <Label htmlFor={`${gateway.id}-whatsapp-verified`}>
                                Mark WhatsApp sender as verified
                              </Label>
                            </div>
                          ) : null}
                          {isApiKey && hasSavedKey ? (
                            <div className="mt-2 flex items-center gap-2 text-sm">
                              <Checkbox
                                id={`${gateway.id}-clear-key`}
                                checked={clearApiKeys[gateway.id] ?? false}
                                onCheckedChange={checked =>
                                  setClearApiKeys(prev => ({
                                    ...prev,
                                    [gateway.id]: Boolean(checked),
                                  }))
                                }
                              />
                              <Label htmlFor={`${gateway.id}-clear-key`}>Clear saved API key</Label>
                            </div>
                          ) : null}
                        </FormField>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Test SMS</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <FormField
              id="testToNumber"
              label="Send a test SMS to"
              description="Use E.164 format (example: +15551234567)."
            >
              <Input
                id="testToNumber"
                value={testToNumber}
                onChange={e => setTestToNumber(e.target.value)}
                placeholder="+15551234567"
                autoComplete="off"
                numeric="phone"
              />
            </FormField>
            <div className="flex items-center">
              <Button
                type="button"
                variant="outline"
                disabled={!testToNumber.trim()}
                onClick={handleSendTest}
              >
                Send Test SMS
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Test WhatsApp</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <FormField
                id="testWhatsappNumber"
                label="Send a test WhatsApp to"
                description="Uses the WhatsApp template saved above."
              >
                <Input
                  id="testWhatsappNumber"
                  value={testWhatsappNumber}
                  onChange={e => setTestWhatsappNumber(e.target.value)}
                  placeholder="+15551234567"
                  autoComplete="off"
                  numeric="phone"
                />
              </FormField>
              <FormField
                id="testWhatsappName"
                label="Template placeholder"
                description="Optional name for the first placeholder."
              >
                <Input
                  id="testWhatsappName"
                  value={testWhatsappName}
                  onChange={e => setTestWhatsappName(e.target.value)}
                  placeholder="John Doe"
                  autoComplete="off"
                />
              </FormField>
            </div>
            <div className="flex items-center">
              <Button
                type="button"
                variant="outline"
                disabled={!testWhatsappNumber.trim()}
                onClick={handleSendWhatsappTest}
              >
                Send Test WhatsApp
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Recent delivery reports</h3>
          {reportsLoading ? (
            <div className="h-24 rounded-lg border border-dashed" />
          ) : reports.length === 0 ? (
            <p className="text-muted-foreground text-sm">No delivery reports yet.</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map(report => {
                    const status =
                      report.statusName || report.statusGroup || report.errorName || 'Pending';
                    const received = formatDateTime(report.receivedAt);
                    return (
                      <TableRow key={report.id}>
                        <TableCell className="capitalize">{report.provider}</TableCell>
                        <TableCell className="font-mono text-xs">{report.toNumber}</TableCell>
                        <TableCell>{status}</TableCell>
                        <TableCell>{received}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SmsGatewayPage() {
  const { data: gatewayRows = [], isLoading } = useGetSmsGateways();
  const { data: reports = [], isLoading: reportsLoading } = useGetSmsDeliveryReports(10);
  const { formatDateTime } = useLocalizationFormat();
  const createGateway = useCreateSmsGateway();
  const updateGateway = useUpdateSmsGateway();
  const activateGateway = useActivateSmsGateway();
  const sendTestSms = useSendTestSms();
  const sendTestWhatsapp = useSendTestWhatsapp();

  const seed = useMemo(() => buildSeed(gatewayRows as GatewayRow[]), [gatewayRows]);

  return (
    <SmsGatewayForm
      key={seed.seedKey || 'empty'}
      seed={seed}
      gatewaysList={gateways}
      gatewayRows={gatewayRows as GatewayRow[]}
      isLoading={isLoading}
      createGateway={createGateway}
      updateGateway={updateGateway}
      activateGateway={activateGateway}
      sendTestSms={sendTestSms}
      sendTestWhatsapp={sendTestWhatsapp}
      reports={reports as DeliveryReport[]}
      reportsLoading={reportsLoading}
      formatDateTime={formatDateTime}
    />
  );
}
