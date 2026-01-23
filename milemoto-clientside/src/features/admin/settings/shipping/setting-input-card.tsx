'use client';

import { useState } from 'react';

import { Button } from '@/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/ui/card';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';

export function SettingInputCard({
  title,
  label,
  id,
  placeholder,
  defaultValue,
  onSave,
  isPending,
  currencySymbol = '$',
}: {
  title: string;
  label: string;
  id: string;
  placeholder?: string;
  defaultValue?: number;
  onSave: (val: number) => void;
  isPending?: boolean;
  currencySymbol?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? 0);

  // Check if value has changed from default
  const isDirty = value !== (defaultValue ?? 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Label
          htmlFor={id}
          required={true}
        >
          {label}
        </Label>
        <div className="relative mt-2">
          <span className="text-muted-foreground absolute left-2.5 top-2.5 text-sm">
            {currencySymbol}
          </span>
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            placeholder={placeholder}
            value={value}
            onChange={e => setValue(parseFloat(e.target.value))}
            className="pl-7"
          />
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          variant="solid"
          size="sm"
          onClick={() => onSave(value)}
          disabled={!isDirty || isPending}
        >
          {isPending ? 'Updating...' : 'Update Cost'}
        </Button>
      </CardFooter>
    </Card>
  );
}
