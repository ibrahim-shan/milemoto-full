import { ArrowLeft, Dot } from 'lucide-react';

import { Button } from '@/ui/button';
import { StatusBadge } from '@/ui/status-badge';

type ProductDetailsHeaderProps = {
  name: string;
  slug: string;
  status: string;
  onBack: () => void;
};

export function ProductDetailsHeader({ name, slug, status, onBack }: ProductDetailsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          justify="center"
          onClick={onBack}
          className="h-9 w-9"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
          <div className="text-muted-foreground flex items-center text-sm">
            <span>{slug}</span>
            <Dot />
            <StatusBadge variant={status === 'active' ? 'success' : 'neutral'}>
              {status}
            </StatusBadge>
          </div>
        </div>
      </div>
      <div className="flex gap-2">{/* Add Edit/Delete buttons here if needed */}</div>
    </div>
  );
}
