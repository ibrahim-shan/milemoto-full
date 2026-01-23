'use client';

import { Building, Calendar, CreditCard, Mail, Phone, ShoppingBag, User } from 'lucide-react';

import { Customer } from '@/hooks/useCustomerQueries';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { formatCurrency } from '@/lib/formatCurrency';
import { Button } from '@/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import { Separator } from '@/ui/separator';
import { StatusBadge } from '@/ui/status-badge';

type CustomerDetailDialogProps = {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CustomerDetailDialog({ customer, open, onOpenChange }: CustomerDetailDialogProps) {
  // Get default currency with position and decimals
  const { symbol: currencySymbol, position: currencyPosition, decimals } = useDefaultCurrency();

  if (!customer) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const totalOrders = customer.totalOrders || 0;
  const totalSpent = customer.totalSpent || 0;
  const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
          <DialogDescription>Complete information about {customer.fullName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Personal Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="text-muted-foreground h-4 w-4" />
                <div>
                  <div className="text-sm font-medium">Full Name</div>
                  <div className="text-muted-foreground text-sm">{customer.fullName}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="text-muted-foreground h-4 w-4" />
                <div>
                  <div className="text-sm font-medium">Email</div>
                  <div className="text-muted-foreground text-sm">{customer.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="text-muted-foreground h-4 w-4" />
                <div>
                  <div className="text-sm font-medium">Phone</div>
                  <div className="text-muted-foreground text-sm">{customer.phone || '-'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="text-muted-foreground h-4 w-4" />
                <div>
                  <div className="text-sm font-medium">Registration Date</div>
                  <div className="text-muted-foreground text-sm">
                    {formatDate(customer.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Building className="text-muted-foreground h-4 w-4" />
                <div>
                  <div className="text-sm font-medium">Status</div>
                  <div className="mt-1">
                    <StatusBadge
                      variant={
                        customer.status === 'active'
                          ? 'success'
                          : customer.status === 'blocked'
                            ? 'error'
                            : 'neutral'
                      }
                    >
                      {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                    </StatusBadge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Purchase Statistics */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Purchase Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="text-sm">Total Orders</span>
                </div>
                <div className="mt-2 text-2xl font-bold">{totalOrders}</div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm">Total Spent</span>
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {formatCurrency(
                    totalSpent,
                    currencySymbol,
                    currencyPosition as 'before' | 'after',
                    decimals,
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm">Avg Order Value</span>
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {formatCurrency(
                    averageOrderValue,
                    currencySymbol,
                    currencyPosition as 'before' | 'after',
                    decimals,
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Last Purchase</span>
                </div>
                <div className="mt-2 text-sm font-medium">
                  {customer.lastPurchaseDate ? formatDate(customer.lastPurchaseDate) : 'Never'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
