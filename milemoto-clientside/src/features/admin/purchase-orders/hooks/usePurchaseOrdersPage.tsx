'use client';

import { useState } from 'react';

import { Archive, CircleCheckBig, Edit, Eye, X } from 'lucide-react';

import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useGetActiveCurrencies } from '@/hooks/useCurrencyQueries';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { useLocalizationFormat } from '@/hooks/useLocalizationFormat';
import { useGetPaymentMethods } from '@/hooks/usePaymentMethodQueries';
import {
  PurchaseOrder,
  useApprovePurchaseOrder,
  useCancelPurchaseOrder,
  useClosePurchaseOrder,
  useCreatePurchaseOrder,
  useGetPurchaseOrderFilterOptions,
  useGetPurchaseOrder,
  useGetPurchaseOrders,
  useRejectPurchaseOrder,
  useSubmitPurchaseOrder,
  useUpdatePurchaseOrder,
} from '@/hooks/usePurchaseOrderQueries';
import type { SortDirection } from '@/ui/sortable-table-head';
import type { TableActionItem } from '@/ui/table-actions-menu';

import { PURCHASE_ORDER_COLUMNS } from '../constants';

type ConfirmAction = 'submit' | 'approve' | 'cancel' | 'reject' | 'close';

export function usePurchaseOrdersPage() {
  const columns = PURCHASE_ORDER_COLUMNS;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<
    'poNumber' | 'subject' | 'status' | 'total' | 'createdAt' | undefined
  >(undefined);
  const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
  const [filters, setFilters] = useState<
    Record<string, string | number | boolean | string[] | undefined>
  >({
    filterMode: 'all',
    status: '',
    vendorId: '',
    paymentMethodId: '',
    dateFrom: '',
    dateTo: '',
  });
  const { formatDateTime } = useLocalizationFormat();
  const { data: currenciesData } = useGetActiveCurrencies();
  const { data: filterOptionsData } = useGetPurchaseOrderFilterOptions();
  const { data: paymentMethodsData } = useGetPaymentMethods({
    page: 1,
    limit: 100,
    search: '',
    status: 'active',
  });
  const { position, decimals } = useDefaultCurrency();
  const currencyPosition: 'before' | 'after' = position === 'after' ? 'after' : 'before';

  const { data, isLoading, isError, refetch } = useGetPurchaseOrders({
    page,
    limit: pageSize,
    search,
    ...(filters.filterMode === 'any' ? { filterMode: 'any' as const } : {}),
    ...(filters.status ? { status: filters.status as string } : {}),
    ...(filters.vendorId ? { vendorId: Number(filters.vendorId) } : {}),
    ...(filters.paymentMethodId ? { paymentMethodId: Number(filters.paymentMethodId) } : {}),
    ...(filters.dateFrom ? { dateFrom: String(filters.dateFrom) } : {}),
    ...(filters.dateTo ? { dateTo: String(filters.dateTo) } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(sortBy && sortDir ? { sortDir } : {}),
  });

  const submitMutation = useSubmitPurchaseOrder();
  const approveMutation = useApprovePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();
  const rejectMutation = useRejectPurchaseOrder();
  const closeMutation = useClosePurchaseOrder();

  const [poToConfirm, setPoToConfirm] = useState<{
    po: PurchaseOrder;
    action: ConfirmAction;
  } | null>(null);
  const createMutation = useCreatePurchaseOrder();
  const updateMutation = useUpdatePurchaseOrder();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogSession, setDialogSession] = useState(0);
  const {
    visibility: columnVisibility,
    setVisibility: setColumnVisibility,
    isColumnVisible,
    visibleColumnCount,
  } = useColumnVisibility(columns, 'admin.purchase-orders.columns');

  const { data: editingPo } = useGetPurchaseOrder(editingId);
  const dialogKeyBase = editingId
    ? editingPo
      ? `edit-${editingPo.id}`
      : `edit-loading-${editingId}`
    : 'create';
  const dialogKey = `${dialogSession}-${dialogKeyBase}`;
  const isDialogReady = !editingId || !!editingPo;
  const dialogOpen = isDialogOpen && isDialogReady;

  const items = data?.items ?? [];
  const currencies = currenciesData ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? Math.ceil((totalCount || 0) / pageSize);

  const openConfirm = (po: PurchaseOrder, action: ConfirmAction) => {
    setPoToConfirm({ po, action });
  };

  const handleConfirmAction = async () => {
    if (!poToConfirm) return;
    const { po, action } = poToConfirm;

    try {
      if (action === 'submit') {
        await submitMutation.mutateAsync(po.id);
      } else if (action === 'approve') {
        await approveMutation.mutateAsync(po.id);
      } else if (action === 'cancel') {
        await cancelMutation.mutateAsync(po.id);
      } else if (action === 'reject') {
        await rejectMutation.mutateAsync(po.id);
      } else if (action === 'close') {
        await closeMutation.mutateAsync(po.id);
      }
    } finally {
      setPoToConfirm(null);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setDialogSession(prev => prev + 1);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (po: PurchaseOrder) => {
    setEditingId(po.id);
    setDialogSession(prev => prev + 1);
    setIsDialogOpen(true);
  };

  const handleSubmitPurchaseOrder = async (
    payload: Parameters<typeof createMutation.mutateAsync>[0],
  ) => {
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const isAnyActionLoading =
    submitMutation.isPending ||
    approveMutation.isPending ||
    cancelMutation.isPending ||
    rejectMutation.isPending ||
    closeMutation.isPending;

  const confirmTitle = poToConfirm
    ? {
        submit: 'Submit Purchase Order?',
        approve: 'Approve Purchase Order?',
        cancel: 'Cancel Purchase Order?',
        reject: 'Reject Purchase Order?',
        close: 'Force Close Purchase Order?',
      }[poToConfirm.action]
    : '';

  const confirmDescription = poToConfirm
    ? {
        submit: 'This will submit the purchase order for approval.',
        approve: 'This will approve the purchase order so it can receive goods.',
        cancel: 'This will cancel the purchase order. This action cannot be undone.',
        reject: 'This will reject the purchase order and mark it as cancelled.',
        close:
          'This will manually close the purchase order. Any remaining ordered quantities will be cancelled and removed from "On Order" stock. This action cannot be undone.',
      }[poToConfirm.action]
    : '';

  const getActionItems = (po: PurchaseOrder): TableActionItem[] => {
    const actions: TableActionItem[] = [
      {
        label: 'View',
        icon: <Eye className="mr-2 h-4 w-4" />,
        href: `/admin/purchase-orders/${po.id}`,
      },
    ];

    if (po.status === 'draft' || po.status === 'pending_approval') {
      actions.push({
        label: 'Edit',
        icon: <Edit className="mr-2 h-4 w-4" />,
        onClick: () => handleOpenEdit(po),
      });
    }

    if (po.status === 'draft') {
      actions.push({
        label: 'Submit for Approval',
        icon: <CircleCheckBig className="mr-2 h-4 w-4" />,
        onClick: () => openConfirm(po, 'submit'),
      });
    }

    if (po.status === 'pending_approval') {
      actions.push(
        {
          label: 'Approve',
          icon: <CircleCheckBig className="mr-2 h-4 w-4" />,
          onClick: () => openConfirm(po, 'approve'),
        },
        {
          label: 'Reject',
          icon: <X className="mr-2 h-4 w-4" />,
          onClick: () => openConfirm(po, 'reject'),
          destructive: true,
        },
      );
    }

    if (po.status === 'draft' || po.status === 'approved') {
      actions.push({
        label: 'Cancel',
        icon: <X className="mr-2 h-4 w-4" />,
        onClick: () => openConfirm(po, 'cancel'),
        destructive: true,
      });
    }

    if (po.status === 'approved' || po.status === 'partially_received') {
      actions.push({
        label: 'Force Close',
        icon: <Archive className="mr-2 h-4 w-4" />,
        onClick: () => openConfirm(po, 'close'),
      });
    }

    return actions;
  };

  return {
    columns,
    search,
    onSearchChange: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    filters,
    onFiltersChange: (
      nextFilters: Record<string, string | number | boolean | string[] | undefined>,
    ) => {
      setFilters(nextFilters);
      setPage(1);
    },
    vendorOptions: (filterOptionsData?.vendors ?? []).map(vendor => ({
      label: vendor.name,
      value: String(vendor.id),
    })),
    paymentMethodOptions: (paymentMethodsData?.items ?? []).map(method => ({
      label: method.name,
      value: String(method.id),
    })),
    columnVisibility,
    onToggleColumn: (columnId: string, visible: boolean) =>
      setColumnVisibility(prev => ({ ...prev, [columnId]: visible })),
    onAdd: handleOpenAdd,
    items,
    isLoading,
    isError,
    refetch,
    visibleColumnCount,
    isColumnVisible,
    currencies,
    currencyPosition,
    decimals,
    formatDateTime,
    getActionItems,
    sortBy,
    sortDir,
    onSortChange: (
      nextSortBy?: string | undefined,
      nextSortDir?: SortDirection | undefined,
    ) => {
      setSortBy(nextSortBy as typeof sortBy);
      setSortDir(nextSortDir);
      setPage(1);
    },
    page,
    pageSize,
    totalCount,
    totalPages,
    onPageChange: setPage,
    onPageSizeChange: (next: number) => {
      setPageSize(next);
      setPage(1);
    },
    dialogKey,
    dialogOpen,
    onDialogOpenChange: setIsDialogOpen,
    purchaseOrder: editingId ? (editingPo ?? null) : null,
    onSubmitPurchaseOrder: handleSubmitPurchaseOrder,
    confirmOpen: !!poToConfirm,
    confirmTitle,
    confirmDescription,
    onConfirmOpenChange: (open: boolean) => !open && setPoToConfirm(null),
    onConfirmAction: handleConfirmAction,
    isAnyActionLoading,
  };
}
