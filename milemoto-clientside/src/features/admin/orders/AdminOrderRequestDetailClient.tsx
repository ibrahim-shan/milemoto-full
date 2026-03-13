'use client';

import { useEffect, useState } from 'react';

import { toast } from 'sonner';

import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import {
  completeAdminOrderRequest,
  decideAdminOrderRequest,
  fetchAdminOrderRequestById,
  fetchAdminOrderRequestRestockLocations,
} from '@/lib/admin-order-requests';
import type { AdminOrderRequestItem } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui/alert-dialog';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { GeneralCombobox } from '@/ui/combobox';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { StatusBadge } from '@/ui/status-badge';
import { Textarea } from '@/ui/textarea';

function formatDateTime(value: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function statusVariant(status: AdminOrderRequestItem['status']) {
  if (status === 'pending') return 'warning';
  if (status === 'approved') return 'info';
  if (status === 'completed') return 'success';
  if (status === 'rejected') return 'error';
  return 'neutral';
}

function formatType(type: AdminOrderRequestItem['type']) {
  if (type === 'cancel') return 'Cancellation';
  if (type === 'return') return 'Return';
  return 'Refund';
}

function ChecklistRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <p className="text-sm">{label}</p>
      <StatusBadge variant={done ? 'success' : 'neutral'}>{done ? 'Done' : 'Pending'}</StatusBadge>
    </div>
  );
}

export function AdminOrderRequestDetailClient({ requestId }: { requestId: number }) {
  const [data, setData] = useState<AdminOrderRequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const [completeNote, setCompleteNote] = useState('');
  const [refundPaymentStatus, setRefundPaymentStatus] = useState<'refunded' | 'partially_refunded'>(
    'refunded',
  );
  const [returnStockLocationIdValue, setReturnStockLocationIdValue] = useState('0');
  const [restockLocations, setRestockLocations] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoadingStockLocations, setIsLoadingStockLocations] = useState(false);
  const [isStockLocationsError, setIsStockLocationsError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchAdminOrderRequestById(requestId)
      .then(res => {
        setData(res);
        setRejectNote(res.adminNote ?? '');
        setApproveNote(res.adminNote ?? '');
        setCompleteNote(res.adminNote ?? '');
      })
      .catch(err => setError((err as { message?: string })?.message || 'Failed to load request'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => {
    if (!(completeOpen && data?.type === 'return')) return;
    let cancelled = false;
    setIsLoadingStockLocations(true);
    setIsStockLocationsError(false);
    fetchAdminOrderRequestRestockLocations()
      .then(result => {
        if (cancelled) return;
        setRestockLocations(result.items ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setRestockLocations([]);
        setIsStockLocationsError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStockLocations(false);
      });
    return () => {
      cancelled = true;
    };
  }, [completeOpen, data?.type]);

  const handleApprove = async () => {
    if (!data) return;
    try {
      setActionLoading('approve');
      const updated = await decideAdminOrderRequest(data.id, {
        status: 'approved',
        ...(approveNote.trim() ? { adminNote: approveNote.trim() } : {}),
      });
      setData(updated);
      toast.success('Request approved');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!data) return;
    const note = rejectNote.trim();
    if (!note) {
      toast.error('Admin note is required when rejecting');
      return;
    }
    try {
      setActionLoading('reject');
      const updated = await decideAdminOrderRequest(data.id, {
        status: 'rejected',
        adminNote: note,
      });
      setData(updated);
      setRejectOpen(false);
      toast.success('Request rejected');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async () => {
    if (!data) return;
    const parsedReturnLocationId =
      data.type === 'return' ? Number.parseInt(returnStockLocationIdValue, 10) : null;
    const hasExplicitRestockLocation =
      data.type === 'return' &&
      Number.isInteger(parsedReturnLocationId) &&
      parsedReturnLocationId !== null &&
      parsedReturnLocationId > 0;
    try {
      setActionLoading('complete');
      const updated = await completeAdminOrderRequest(data.id, {
        ...(completeNote.trim() ? { adminNote: completeNote.trim() } : {}),
        ...(data.type === 'refund' ? { refundPaymentStatus } : {}),
        ...(hasExplicitRestockLocation ? { returnStockLocationId: parsedReturnLocationId } : {}),
      });
      setData(updated);
      setCompleteOpen(false);
      toast.success('Request completed');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to complete request');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <PermissionGuard requiredPermission="orders.read">
      <Card>
        <CardHeader>
          <CardTitle>Order Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading request...</p>
          ) : error || !data ? (
            <p className="text-sm text-red-600">{error || 'Request not found'}</p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Request #{data.id}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground text-sm">{formatType(data.type)}</p>
                    <StatusBadge variant={statusVariant(data.status)}>
                      {data.status.replace(/_/g, ' ')}
                    </StatusBadge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    href="/admin/order-requests"
                    variant="outline"
                    size="sm"
                  >
                    Back to Requests
                  </Button>
                  {data.status === 'pending' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => void handleApprove()}
                        disabled={actionLoading !== null}
                      >
                        {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectOpen(true)}
                        disabled={actionLoading !== null}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  {data.status === 'approved' ? (
                    <Button
                      size="sm"
                      onClick={() => setCompleteOpen(true)}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === 'complete' ? 'Completing...' : 'Complete'}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Info
                  label="Order Number"
                  value={data.orderNumber}
                />
                <Info
                  label="Order ID"
                  value={`#${data.orderId}`}
                />
                <Info
                  label="Customer"
                  value={data.customerName}
                />
                <Info
                  label="Customer Phone"
                  value={data.customerPhone}
                />
                <Info
                  label="Requested At"
                  value={formatDateTime(data.requestedAt)}
                />
                <Info
                  label="Decided At"
                  value={formatDateTime(data.decidedAt)}
                />
                <Info
                  label="Completed At"
                  value={formatDateTime(data.completedAt)}
                />
                <Info
                  label="Decided By User"
                  value={data.decidedByUserId ? `#${data.decidedByUserId}` : '-'}
                />
              </div>

              <section className="rounded-md border p-4">
                <p className="text-muted-foreground text-xs font-semibold uppercase">Reason</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{data.reason || '-'}</p>
              </section>

              <section className="rounded-md border p-4">
                <p className="text-muted-foreground text-xs font-semibold uppercase">Admin Note</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{data.adminNote || '-'}</p>
              </section>

              <section className="rounded-md border p-4">
                <p className="text-muted-foreground text-xs font-semibold uppercase">
                  Operational Checklist
                </p>
                <div className="mt-3 space-y-2">
                  <ChecklistRow
                    label="Request Submitted"
                    done={true}
                  />
                  <ChecklistRow
                    label="Admin Decision Recorded"
                    done={data.status !== 'pending' && data.status !== 'cancelled_by_user'}
                  />
                  {data.type === 'return' ? (
                    <ChecklistRow
                      label="Return Stock Action Completed"
                      done={data.status === 'completed'}
                    />
                  ) : null}
                  {data.type === 'refund' ? (
                    <ChecklistRow
                      label="Refund Completion Applied"
                      done={data.status === 'completed'}
                    />
                  ) : null}
                  <ChecklistRow
                    label="Request Closed"
                    done={
                      data.status === 'completed' ||
                      data.status === 'rejected' ||
                      data.status === 'cancelled_by_user'
                    }
                  />
                </div>
              </section>

              {data.status === 'pending' ? (
                <section className="rounded-md border p-4">
                  <Label htmlFor="approve-note">Approval Note (optional)</Label>
                  <Textarea
                    id="approve-note"
                    className="mt-2"
                    rows={3}
                    value={approveNote}
                    onChange={event => setApproveNote(event.target.value)}
                    placeholder="Optional note for approval..."
                  />
                </section>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Request</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for rejection. This note is required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            rows={4}
            value={rejectNote}
            onChange={event => setRejectNote(event.target.value)}
            placeholder="Rejection note..."
            aria-label="Rejection note"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault();
                void handleReject();
              }}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Request</AlertDialogTitle>
            <AlertDialogDescription>Finalize this approved request.</AlertDialogDescription>
          </AlertDialogHeader>
          {data?.type === 'refund' ? (
            <div className="space-y-2">
              <Label htmlFor="refund-payment-status">Refund Payment Status</Label>
              <Select
                value={refundPaymentStatus}
                onValueChange={value =>
                  setRefundPaymentStatus(value as 'refunded' | 'partially_refunded')
                }
              >
                <SelectTrigger id="refund-payment-status">
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="partially_refunded">Partially Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {data?.type === 'return' ? (
            <div className="space-y-2">
              <Label htmlFor="return-stock-location-id">Restock Location (optional)</Label>
              <GeneralCombobox
                id="return-stock-location-id"
                value={returnStockLocationIdValue}
                onChange={value => setReturnStockLocationIdValue(String(value))}
                disabled={isLoadingStockLocations}
                placeholder={isLoadingStockLocations ? 'Loading locations...' : 'Select location'}
                emptyMessage="No stock locations found."
                data={[
                  {
                    value: '0',
                    label: 'Use default policy location',
                    searchValue: 'default policy',
                  },
                  ...restockLocations.map(location => ({
                    value: String(location.id),
                    label: `#${location.id} ${location.name}`,
                    searchValue: `${location.name} ${location.id}`,
                  })),
                ]}
              />
              {!isLoadingStockLocations &&
              !isStockLocationsError &&
              restockLocations.length === 0 ? (
                <p className="text-xs text-amber-600">
                  No stock locations found. Completion will use default policy fallback behavior.
                </p>
              ) : null}
              {isStockLocationsError ? (
                <p className="text-xs text-amber-600">
                  Could not load stock locations. You can still complete using default policy
                  location.
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Choose a location for restock, or keep default policy location.
                </p>
              )}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="complete-note">Completion Note (optional)</Label>
            <Input
              id="complete-note"
              value={completeNote}
              onChange={event => setCompleteNote(event.target.value)}
              placeholder="Optional completion note..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault();
                void handleComplete();
              }}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'complete' ? 'Completing...' : 'Complete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PermissionGuard>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs uppercase">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export default AdminOrderRequestDetailClient;
