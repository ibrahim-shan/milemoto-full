import { AlertCircle } from 'lucide-react';

import { Button } from '@/ui/button';

type TableStateMessageProps = {
  variant: 'empty' | 'error';
  message: string;
  onRetry?: () => void;
};

export function TableStateMessage({ variant, message, onRetry }: TableStateMessageProps) {
  const iconClassName = variant === 'error' ? 'h-5 w-5' : 'h-4 w-4';

  if (variant === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="flex items-center justify-center gap-2">
          <AlertCircle className={iconClassName} />
          <span>{message}</span>
        </div>
        {onRetry ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
          >
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <AlertCircle className={iconClassName} />
      <span>{message}</span>
    </div>
  );
}
