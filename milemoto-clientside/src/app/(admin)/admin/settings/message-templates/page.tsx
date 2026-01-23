'use client';

import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { Separator } from '@/ui/separator';
import { Switch } from '@/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/ui/Tabs';
import { Textarea } from '@/ui/textarea';

type TemplateChannel = 'email' | 'sms' | 'whatsapp';

type TemplateKey =
  | 'order_pending'
  | 'order_confirmation'
  | 'order_on_the_way'
  | 'order_delivered'
  | 'order_canceled'
  | 'order_rejected'
  | 'order_refunded'
  | 'admin_new_order'
  | 'reset_password'
  | 'signup_verification'
  | 'phone_verification'
  | 'email_change_verification'
  | 'phone_change_verification';

type TemplateDefinition = {
  key: TemplateKey;
  label: string;
  description: string;
  defaultBody: string;
};

type TemplateState = Record<
  TemplateChannel,
  Record<TemplateKey, { enabled: boolean; body: string }>
>;

const channels: Array<{ key: TemplateChannel; label: string; description: string }> = [
  {
    key: 'email',
    label: 'Email',
    description: 'Use for long-form updates and account notifications.',
  },
  {
    key: 'sms',
    label: 'SMS',
    description: 'Short notifications and verification codes.',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    description: 'Requires approved templates for your provider.',
  },
];

const templateDefinitions: TemplateDefinition[] = [
  {
    key: 'order_pending',
    label: 'Order Pending Message',
    description: 'Sent when an order is placed and awaiting confirmation.',
    defaultBody:
      'Your order {{orderNumber}} is pending. We will confirm shortly. Thank you for shopping with MileMoto.',
  },
  {
    key: 'order_confirmation',
    label: 'Order Confirmation Message',
    description: 'Sent when an order is confirmed.',
    defaultBody:
      'Great news! Order {{orderNumber}} is confirmed. We will notify you when it ships.',
  },
  {
    key: 'order_on_the_way',
    label: 'Order On The Way Message',
    description: 'Sent when an order is shipped.',
    defaultBody:
      'Your order {{orderNumber}} is on the way. Track your shipment using {{trackingLink}}.',
  },
  {
    key: 'order_delivered',
    label: 'Order Delivered Message',
    description: 'Sent when delivery is completed.',
    defaultBody: 'Order {{orderNumber}} was delivered. We hope you enjoy your purchase!',
  },
  {
    key: 'order_canceled',
    label: 'Order Canceled Message',
    description: 'Sent when an order is canceled.',
    defaultBody: 'Order {{orderNumber}} has been canceled. If this is unexpected, contact support.',
  },
  {
    key: 'order_rejected',
    label: 'Order Rejected Message',
    description: 'Sent when an order is rejected.',
    defaultBody:
      'Order {{orderNumber}} was rejected. Please review the order details or contact support.',
  },
  {
    key: 'order_refunded',
    label: 'Order Refunded Message',
    description: 'Sent when a refund is issued.',
    defaultBody:
      'Order {{orderNumber}} has been refunded. Please allow 3-5 business days for the funds to appear.',
  },
  {
    key: 'admin_new_order',
    label: 'Admin & Manager New Order Message',
    description: 'Internal notification for new orders.',
    defaultBody:
      'New order {{orderNumber}} placed by {{customerName}}. Review and confirm in the admin panel.',
  },
  {
    key: 'reset_password',
    label: 'Reset Password Message',
    description: 'Sent for password reset flows.',
    defaultBody:
      'Reset your MileMoto password using this link: {{resetLink}}. It expires in 10 minutes.',
  },
  {
    key: 'signup_verification',
    label: 'Signup Verification Message',
    description: 'Sent during signup verification.',
    defaultBody: 'Verify your MileMoto account here: {{verificationLink}}.',
  },
  {
    key: 'phone_verification',
    label: 'Phone Verification Message',
    description: 'Sent to verify a phone number.',
    defaultBody: 'Use {{verificationCode}} to verify your MileMoto phone number.',
  },
  {
    key: 'email_change_verification',
    label: 'Email Change Verification Message',
    description: 'Sent to confirm a new email address.',
    defaultBody: 'Confirm your new MileMoto email here: {{verificationLink}}.',
  },
  {
    key: 'phone_change_verification',
    label: 'Phone Change Verification Message',
    description: 'Sent to confirm a new phone number.',
    defaultBody: 'Use {{verificationCode}} to confirm your new MileMoto phone number.',
  },
];

const templateVariables: Array<{ token: string; description: string }> = [
  { token: '{{orderNumber}}', description: 'Order number shown to the customer.' },
  { token: '{{customerName}}', description: 'Customer full name.' },
  { token: '{{trackingLink}}', description: 'Tracking URL for shipped orders.' },
  { token: '{{resetLink}}', description: 'Password reset link for email templates.' },
  { token: '{{resetCode}}', description: 'One-time code for password reset.' },
  { token: '{{verificationLink}}', description: 'Signup verification link for email templates.' },
  { token: '{{verificationCode}}', description: 'One-time code for signup or phone verification.' },
];

const channelDefaults: Record<TemplateChannel, string> = {
  email: 'Email template',
  sms: 'SMS template',
  whatsapp: 'WhatsApp template',
};

function buildInitialState(): TemplateState {
  const base: TemplateState = {
    email: {} as TemplateState['email'],
    sms: {} as TemplateState['sms'],
    whatsapp: {} as TemplateState['whatsapp'],
  };

  templateDefinitions.forEach(def => {
    (Object.keys(base) as TemplateChannel[]).forEach(channel => {
      base[channel][def.key] = {
        enabled: true,
        body: getDefaultBody(channel, def),
      };
    });
  });

  return base;
}

function getDefaultBody(channel: TemplateChannel, def: TemplateDefinition) {
  if (def.key === 'reset_password') {
    return channel === 'email'
      ? 'Reset your MileMoto password using this link: {{resetLink}}. It expires in 10 minutes.'
      : 'Use this code to reset your MileMoto password: {{resetCode}}. It expires in 10 minutes.';
  }

  if (def.key === 'signup_verification') {
    return channel === 'email'
      ? 'Verify your MileMoto account here: {{verificationLink}}.'
      : 'Welcome to MileMoto! Use {{verificationCode}} to verify your account.';
  }

  if (def.key === 'phone_verification') {
    return 'Use {{verificationCode}} to verify your MileMoto phone number.';
  }

  if (def.key === 'email_change_verification') {
    return 'Confirm your new MileMoto email here: {{verificationLink}}.';
  }

  if (def.key === 'phone_change_verification') {
    return 'Use {{verificationCode}} to confirm your new MileMoto phone number.';
  }

  const label = channelDefaults[channel];
  return def.defaultBody.replace('Message', label);
}

function isTemplateVisible(channel: TemplateChannel, key: TemplateKey) {
  if (key === 'signup_verification' || key === 'email_change_verification') {
    return channel === 'email';
  }
  if (key === 'phone_verification' || key === 'phone_change_verification') {
    return channel !== 'email';
  }
  return true;
}

export default function MessageTemplatesPage() {
  const [activeTab, setActiveTab] = useState<TemplateChannel>('email');
  const [templates, setTemplates] = useState<TemplateState>(() => buildInitialState());
  const activeTabMeta = channels.find(tab => tab.key === activeTab) ?? channels[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Message Templates</CardTitle>
        <CardDescription>
          Manage templates used for email, SMS, and WhatsApp messages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs
          defaultValue="email"
          value={activeTab}
          onValueChange={value => setActiveTab(value as TemplateChannel)}
        >
          <TabsList>
            {channels.map(tab => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="space-y-1.5 pt-2">
          <h3 className="text-sm font-medium">
            {activeTabMeta ? `${activeTabMeta.label} templates` : 'Templates'}
          </h3>
          <p className="text-muted-foreground text-sm">{activeTabMeta?.description}</p>
        </div>

        <Separator />

        <div className="bg-muted/40 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Code Dictionary</p>
              <p className="text-muted-foreground text-xs">
                Use these variables in any template. They will be replaced at send time.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {templateVariables.map(variable => (
              <div
                key={variable.token}
                className="bg-background flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <span className="font-mono text-xs">{variable.token}</span>
                <span className="text-muted-foreground text-xs">{variable.description}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid gap-4">
            {templateDefinitions
              .filter(def => isTemplateVisible(activeTab, def.key))
              .map(def => {
                const current = templates[activeTab][def.key];
                return (
                  <div
                    key={`${activeTab}-${def.key}`}
                    className="space-y-3 rounded-lg border p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{def.label}</p>
                        <p className="text-muted-foreground text-xs">{def.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={current.enabled}
                          onCheckedChange={checked =>
                            setTemplates(prev => ({
                              ...prev,
                              [activeTab]: {
                                ...prev[activeTab],
                                [def.key]: {
                                  ...prev[activeTab][def.key],
                                  enabled: checked,
                                },
                              },
                            }))
                          }
                          aria-label={`Toggle ${def.label}`}
                        />
                        <span className="text-muted-foreground text-xs">
                          {current.enabled ? 'On' : 'Off'}
                        </span>
                      </div>
                    </div>
                    <Textarea
                      rows={3}
                      value={current.body}
                      disabled={!current.enabled}
                      onChange={event =>
                        setTemplates(prev => ({
                          ...prev,
                          [activeTab]: {
                            ...prev[activeTab],
                            [def.key]: {
                              ...prev[activeTab][def.key],
                              body: event.target.value,
                            },
                          },
                        }))
                      }
                    />
                  </div>
                );
              })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
