import type { ElementType } from 'react';

import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

export function Skeleton({
  className = '',
  as: Tag = 'div',
}: {
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag
      className={cn(
        'bg-foreground/10 relative isolate overflow-hidden rounded-md dark:bg-white/10',
        className,
      )}
      aria-hidden
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
        initial={{ translateX: '-100%' }}
        animate={{ translateX: '100%' }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'linear',
        }}
      />
    </Tag>
  );
}
