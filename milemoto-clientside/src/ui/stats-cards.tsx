import { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/ui/card';

export interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

interface StatsCardsProps {
  data: StatItem[];
}

export function StatsCards({ data }: StatsCardsProps) {
  const count = data.length;

  return (
    <div
      className={cn(
        'mb-8 grid gap-4',
        count === 1 && 'grid-cols-1',
        count === 2 && 'grid-cols-1 md:grid-cols-2',
        count === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        count >= 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      )}
    >
      {data.map((item, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-primary/10 rounded-full p-2">
                <item.icon className="text-primary h-6 w-6" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-medium">{item.label}</p>
                <h3 className="text-2xl font-bold">{item.value}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
