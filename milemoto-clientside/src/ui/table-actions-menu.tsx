import type { MouseEventHandler, ReactNode } from 'react';
import Link, { type LinkProps } from 'next/link';

import { MoreHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';

type BaseActionItem = {
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
};

export type TableActionItem =
  | (BaseActionItem & {
      href: LinkProps['href'];
      onClick?: never;
    })
  | (BaseActionItem & {
      onClick: () => void;
      href?: never;
    });

type TableActionsMenuProps = {
  items: TableActionItem[];
  align?: 'start' | 'center' | 'end';
  triggerLabel?: string;
  triggerClassName?: string;
  onTriggerClick?: MouseEventHandler<HTMLButtonElement>;
};

export function TableActionsMenu({
  items,
  align = 'end',
  triggerLabel = 'Open menu',
  triggerClassName,
  onTriggerClick,
}: TableActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', triggerClassName)}
          justify="center"
          onClick={onTriggerClick}
        >
          <span className="sr-only">{triggerLabel}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {items.map((item, index) => {
          const className = cn(item.destructive && 'text-destructive focus:text-destructive');
          const disabledProps = item.disabled ? { disabled: true } : {};
          const content = (
            <>
              {item.icon}
              {item.label}
            </>
          );

          if (item.href) {
            return (
              <DropdownMenuItem
                key={`${item.label}-${index}`}
                asChild
                className={className}
                {...disabledProps}
              >
                <Link href={item.href}>{content}</Link>
              </DropdownMenuItem>
            );
          }

          return (
            <DropdownMenuItem
              key={`${item.label}-${index}`}
              onClick={item.onClick}
              className={className}
              {...disabledProps}
            >
              {content}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
