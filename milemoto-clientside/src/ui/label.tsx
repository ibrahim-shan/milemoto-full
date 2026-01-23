'use client';

import * as React from 'react';

import * as LabelPrimitive from '@radix-ui/react-label';

import { cn } from '@/lib/utils';

function Label({
  className,
  required,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { required?: boolean }) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex select-none items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        className,
      )}
      {...props}
    >
      {props.children}
      {required && <span className="text-destructive">*</span>}
    </LabelPrimitive.Root>
  );
}

export { Label };
