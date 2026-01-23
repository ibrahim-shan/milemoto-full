import { cn } from '@/lib/utils';

type SectionCardProps = {
  title: string;
  className?: string;
  children: React.ReactNode;
};

export function SectionCard({ title, className, children }: SectionCardProps) {
  return (
    <div className={cn('rounded-md border p-4', className)}>
      <p className="text-muted-foreground text-xs font-semibold uppercase">{title}</p>
      {children}
    </div>
  );
}
