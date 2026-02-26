'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import {
  Banknote,
  BrickWallShieldIcon,
  Building,
  CreditCard,
  FileText,
  LanguagesIcon,
  LocationEdit,
  Mail,
  MessageSquare,
  Package,
  Palette,
  PercentDiamond,
  Ruler,
  Shield,
  Ship,
  Users,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';

const settingsGroups: Array<{
  title: string;
  items: Array<{ href: string; label: string; icon: ReactNode }>;
}> = [
  {
    title: 'Store',
    items: [
      {
        href: '/admin/settings/company',
        label: 'Company Details',
        icon: <Building className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/site-settings',
        label: 'Site Settings',
        icon: <Palette className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/languages',
        label: 'Languages',
        icon: <LanguagesIcon className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/stock-display',
        label: 'Stock Display',
        icon: <Package className="h-4 w-4" />,
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        href: '/admin/settings/location-setup',
        label: 'Location Setup',
        icon: <LocationEdit className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/shipping',
        label: 'Shipping Setup',
        icon: <Ship className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/inbound-shipping-methods',
        label: 'Inbound Shipping',
        icon: <Package className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/units',
        label: 'Units',
        icon: <Ruler className="h-4 w-4" />,
      },
    ],
  },
  {
    title: 'Finance & Tax',
    items: [
      {
        href: '/admin/settings/payments',
        label: 'Payments',
        icon: <CreditCard className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/taxes',
        label: 'Taxes & Duties',
        icon: <PercentDiamond className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/tax-policy',
        label: 'Tax Policy',
        icon: <PercentDiamond className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/currencies',
        label: 'Currencies',
        icon: <Banknote className="h-4 w-4" />,
      },
    ],
  },
  {
    title: 'Communication',
    items: [
      {
        href: '/admin/settings/mail',
        label: 'Mail',
        icon: <Mail className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/sms-gateway',
        label: 'SMS Gateway',
        icon: <MessageSquare className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/message-templates',
        label: 'Message Templates',
        icon: <FileText className="h-4 w-4" />,
      },
    ],
  },
  {
    title: 'Access & Security',
    items: [
      {
        href: '/admin/settings/users',
        label: 'Users',
        icon: <Users className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/roles',
        label: 'Roles',
        icon: <Shield className="h-4 w-4" />,
      },
      {
        href: '/admin/settings/security',
        label: 'Security',
        icon: <BrickWallShieldIcon className="h-4 w-4" />,
      },
    ],
  },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4">
      {settingsGroups.map((group, groupIndex) => (
        <section
          key={group.title}
          aria-label={group.title}
          className={cn('rounded-lg border p-2', groupIndex === 0 ? 'mt-0' : '')}
        >
          <p className="text-muted-foreground px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em]">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items.map(item => {
              const isActive = pathname === item.href;
              return (
                <Button
                  key={item.href}
                  href={item.href}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  leftIcon={item.icon}
                  className={cn(
                    'w-full justify-start px-2.5',
                    !isActive && 'text-muted-foreground',
                  )}
                >
                  {item.label}
                </Button>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
