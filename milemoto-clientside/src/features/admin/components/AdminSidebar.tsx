'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';

import { adminNavigation } from '@/config/admin-navigation';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/collapsible';

type NavGroupProps = {
  title: string;
  icon: React.ReactNode;
  links: { href: string; label: string; icon: React.ReactNode }[];
};

function NavGroup({ title, icon, links }: NavGroupProps) {
  const pathname = usePathname();
  const isGroupActive = links.some(l => pathname.startsWith(l.href));
  const [isOpen, setIsOpen] = useState(isGroupActive);

  useEffect(() => {
    setIsOpen(isGroupActive);
  }, [isGroupActive]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full"
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          justify="between"
          className="px-3"
          leftIcon={icon}
          rightIcon={
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
              aria-hidden
            />
          }
          aria-expanded={isOpen}
        >
          <span className="inline-flex items-center gap-2 leading-none">{title}</span>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-1 space-y-1 pl-5">
          {links.map(link => (
            <NavItem
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function NavItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = href === '/admin/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <Button
      href={href}
      variant={isActive ? 'secondary' : 'ghost'}
      className="flex w-full items-center justify-start gap-3 px-3"
      size="sm"
      leftIcon={icon}
    >
      {label}
    </Button>
  );
}

// ... (existing imports)

export function AdminSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: permissions } = useMyPermissions();

  const can = (slug: string) => {
    // If permissions are loading (undefined), we hide items to be safe,
    // or we could show them if we wanted to be optimistic.
    // Secure default: hide until loaded.
    if (!permissions) return false;
    return permissions.includes(slug);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => onOpenChange(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'border-border/60 bg-card fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col border-r transition-transform duration-300 ease-in-out md:translate-x-0',
          open && 'translate-x-0',
        )}
        aria-label="Admin sidebar"
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link
            href="/admin/dashboard"
            className="text-lg font-bold tracking-tight"
          >
            MileMoto Admin
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>

        <nav
          className="flex-1 space-y-2 overflow-y-auto p-3"
          aria-label="Admin navigation"
        >
          {adminNavigation.map((item, index) => {
            if ('items' in item) {
              const validLinks = item.items.filter(link => can(link.perm));
              if (validLinks.length === 0) return null;

              return (
                <NavGroup
                  key={index}
                  title={item.title}
                  icon={<item.icon className="h-4 w-4" />}
                  links={validLinks.map(l => ({
                    href: l.href,
                    label: l.label,
                    icon: <l.icon className="h-4 w-4" />,
                  }))}
                />
              );
            }

            if (!can(item.perm)) return null;

            return (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={<item.icon className="h-4 w-4" />}
              />
            );
          })}
        </nav>
      </aside>
    </>
  );
}
