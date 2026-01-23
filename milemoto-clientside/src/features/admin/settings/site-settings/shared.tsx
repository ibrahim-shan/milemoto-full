import { cn } from '@/lib/utils';
import { Label } from '@/ui/label';
import { Switch } from '@/ui/switch';

/**
 * A reusable component for a single form field.
 * Groups a label, description, and the form control.
 */
export function FormField({
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

/**
 * A reusable component for a Switch/Toggle setting.
 */
export function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <Label
          htmlFor={id}
          className="text-base"
        >
          {label}
        </Label>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
