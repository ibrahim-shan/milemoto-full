import * as React from 'react';

import { cn } from '@/lib/utils';

type InputProps = React.ComponentProps<'input'> & {
  numeric?: 'digits' | 'phone';
};

function normalizeNumericValue(value: string, mode: InputProps['numeric']) {
  if (mode === 'digits') {
    return value.replace(/\D+/g, '');
  }
  const cleaned = value.replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) {
    return `+${cleaned.slice(1).replace(/[^\d]/g, '')}`;
  }
  return cleaned.replace(/[^\d]/g, '');
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, numeric, onChange, inputMode, ...props }, ref) => {
    const resolvedInputMode =
      inputMode ?? (numeric === 'digits' ? 'numeric' : numeric === 'phone' ? 'tel' : undefined);

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = event => {
      if (numeric) {
        const next = normalizeNumericValue(event.currentTarget.value, numeric);
        if (next !== event.currentTarget.value) {
          event.currentTarget.value = next;
        }
      }
      onChange?.(event);
    };

    return (
      <input
        type={type}
        inputMode={resolvedInputMode}
        className={cn(
          'border-input file:text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
