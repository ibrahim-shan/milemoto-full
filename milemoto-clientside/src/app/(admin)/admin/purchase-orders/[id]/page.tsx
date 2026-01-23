'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import {
  AlertCircle,
  ArrowLeft,
  Eye,
  Mail,
  MoreHorizontal,
  PackagePlus,
  Printer,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

import { GoodsReceiptDialog } from '@/features/admin/goods-receipts/goods-receipt-dialog';
import { PurchaseOrderPrintTemplate } from '@/features/admin/purchase-orders/print-template';
import { PurchaseOrderStatusBadge } from '@/features/admin/purchase-orders/purchase-order-status-badge';
import { Skeleton } from '@/features/feedback/Skeleton';
import { useGetActiveCurrencies } from '@/hooks/useCurrencyQueries';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { useGetGoodsReceipt, useGetGoodsReceipts } from '@/hooks/useGoodsReceiptQueries';
import { useLocalizationFormat } from '@/hooks/useLocalizationFormat';
import { useGetAllProductVariants } from '@/hooks/useProductQueries';
import { useGetPurchaseOrder } from '@/hooks/usePurchaseOrderQueries';
import { useGetBrandingSettings, useGetDocumentSettings } from '@/hooks/useSiteSettingsQueries';
import { useGetStockLocations } from '@/hooks/useStockLocationQueries';
import { useGetVendors } from '@/hooks/useVendorQueries';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { StatusBadge } from '@/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';

export default function PurchaseOrderDetailPage() {
  const { data: branding } = useGetBrandingSettings();
  const { data: documents } = useGetDocumentSettings();

  const variantLabelFor = (variantId: number) => {
    const v = variants.find(v => v.id === variantId);
    if (!v) return `#${variantId}`;
    return `${v.sku} - ${v.productName || ''} / ${v.variantName || ''}`;
  };
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { formatDate, formatDateTime } = useLocalizationFormat();

  const { data: po, isLoading, isError } = useGetPurchaseOrder(Number.isNaN(id) ? null : id);
  const { data: vendorsData } = useGetVendors({
    page: 1,
    limit: 100,
    search: '',
    status: 'active',
  });
  const { data: locationsData } = useGetStockLocations({
    page: 1,
    limit: 100,
    search: '',
    status: 'active',
    type: undefined,
  });
  const { data: currenciesData } = useGetActiveCurrencies();
  const { data: variantsData } = useGetAllProductVariants({ page: 1, limit: 100 });
  const { position: currencyPosition, decimals } = useDefaultCurrency();

  const vendors = vendorsData?.items ?? [];
  const locations = locationsData?.items ?? [];
  const currencies = currenciesData ?? [];
  const variants = variantsData?.items ?? [];
  const { data: grnList } = useGetGoodsReceipts(Number.isNaN(id) ? {} : { purchaseOrderId: id });
  const draftGrn = grnList?.items.find(grn => grn.status === 'draft');
  const { data: draftGrnDetail } = useGetGoodsReceipt(draftGrn ? draftGrn.id : null);

  const vendorName = po ? (vendors.find(v => v.id === po.vendorId)?.name ?? `#${po.vendorId}`) : '';
  const locationName = po
    ? (locations.find(loc => loc.id === po.stockLocationId)?.name ?? `#${po.stockLocationId}`)
    : '';
  const currencyForPo = po ? currencies.find(c => c.id === po.currencyId) : undefined;
  const currencyName = currencyForPo
    ? currencyForPo.symbol
      ? `${currencyForPo.code} (${currencyForPo.symbol})`
      : currencyForPo.code
    : po
      ? `#${po.currencyId}`
      : '';

  const totals = useMemo(() => {
    if (!po) {
      return null;
    }

    const subtotal = Number(po.subtotal ?? 0);
    const discountAmount = Number(po.discountAmount ?? 0);
    const taxTotal = Number(po.taxTotal ?? 0);
    const shipping = po.shippingCost ? Number(po.shippingCost) : 0;

    const totalBeforeTaxesShipping = subtotal - discountAmount;
    const totalAfterTaxesShippingDiscounts = subtotal - discountAmount + shipping + taxTotal;

    return {
      subtotal,
      discountAmount,
      taxTotal,
      shipping,
      totalBeforeTaxesShipping,
      totalAfterTaxesShippingDiscounts,
    };
  }, [po]);

  const formatAmount = (value: number) => {
    const base = value.toFixed(decimals);
    if (!currencyForPo || !currencyForPo.symbol) return base;
    return currencyPosition === 'before'
      ? `${currencyForPo.symbol} ${base}`
      : `${base} ${currencyForPo.symbol}`;
  };

  const [isGrnDialogOpen, setIsGrnDialogOpen] = useState(false);

  // Print Logic
  const vendor = po ? vendors.find(v => v.id === po.vendorId) : undefined;
  const location = po ? locations.find(loc => loc.id === po.stockLocationId) : undefined;

  const printComponentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: po ? `PO-${po.poNumber}` : 'Purchase Order',
  });

  const mailtoLink =
    po && vendor?.email
      ? `mailto:${vendor.email}?subject=Purchase Order ${po.poNumber}&body=Dear ${
          vendor.name
        },%0D%0A%0D%0APlease find attached Purchase Order ${po.poNumber}.%0D%0A%0D%0AThank you.`
      : undefined;

  return (
    <div className="space-y-4">
      {/* Hidden Print Template */}
      {po && (
        <div style={{ display: 'none' }}>
          <PurchaseOrderPrintTemplate
            ref={printComponentRef}
            po={po}
            vendor={vendor}
            location={location}
            branding={branding}
            documents={documents}
            variants={variants}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            href="/admin/purchase-orders"
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Purchase Orders
          </Button>

          {po && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={handlePrint}
                leftIcon={<Printer className="h-4 w-4" />}
              >
                Print / Download PDF
              </Button>

              {mailtoLink && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  href={mailtoLink}
                  leftIcon={<Mail className="h-4 w-4" />}
                >
                  Email Vendor
                </Button>
              )}
            </>
          )}
        </div>

        {po && (po.status === 'approved' || po.status === 'partially_received') && (
          <Button
            type="button"
            variant="solid"
            size="sm"
            leftIcon={<PackagePlus className="h-4 w-4" />}
            onClick={() => setIsGrnDialogOpen(true)}
          >
            Create Goods Receipt
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : isError || !po ? (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Failed to load purchase order.</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header info */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs uppercase">PO Number</div>
                  <div className="font-mono text-sm">{po.poNumber}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs uppercase">Subject</div>
                  <div className="text-sm">{po.subject}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs uppercase">Status</div>
                  <PurchaseOrderStatusBadge status={po.status} />
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs uppercase">Vendor</div>
                  <div className="text-sm">{vendorName}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs uppercase">Stock Location</div>
                  <div className="text-sm">{locationName}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs uppercase">Currency</div>
                  <div className="text-sm">{currencyName}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs uppercase">Payment Terms</div>
                  <div className="text-sm">{po.paymentTerms}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs uppercase">Expected Delivery</div>
                  <div className="text-sm">
                    {po.expectedDeliveryDate
                      ? formatDate(po.expectedDeliveryDate)
                      : 'Not specified'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs uppercase">Created At</div>
                  <div className="text-sm">{formatDateTime(po.createdAt)}</div>
                </div>
              </div>

              {/* Notes */}
              {po.internalNote && (
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs uppercase">Internal Note</div>
                  <div className="whitespace-pre-wrap text-sm">{po.internalNote}</div>
                </div>
              )}

              {/* Lines */}
              <div className="space-y-3">
                <div className="text-muted-foreground text-xs font-semibold uppercase">
                  Line Items
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead>Ordered</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!po.lines || po.lines.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-muted-foreground text-center"
                        >
                          No line items.
                        </TableCell>
                      </TableRow>
                    ) : (
                      po.lines.map(line => (
                        <TableRow key={line.id}>
                          <TableCell>{variantLabelFor(line.productVariantId)}</TableCell>

                          <TableCell>{line.orderedQty}</TableCell>
                          <TableCell>{line.receivedQty}</TableCell>
                          <TableCell>
                            {line.orderedQty -
                              (line.receivedQty + line.rejectedQty + line.cancelledQty)}
                          </TableCell>
                          <TableCell>{formatAmount(Number(line.unitCost))}</TableCell>
                          <TableCell>
                            {formatAmount(Number(line.unitCost) * line.orderedQty)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              {totals && (
                <div className="space-y-2 rounded-md border p-4 md:ml-auto md:w-1/2">
                  <div className="text-muted-foreground text-xs font-semibold uppercase">
                    Summary
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatAmount(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-medium">{formatAmount(totals.discountAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="font-medium">{formatAmount(totals.shipping)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">{formatAmount(totals.taxTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Before Taxes, Shipping</span>
                      <span className="font-medium">
                        {formatAmount(totals.totalBeforeTaxesShipping)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total After Taxes, Shipping, Discounts
                      </span>
                      <span className="font-semibold">
                        {formatAmount(totals.totalAfterTaxesShippingDiscounts)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Goods Receipts */}
              {grnList && grnList.items.length > 0 && (
                <div className="space-y-2 rounded-md border p-4">
                  <div className="text-muted-foreground text-xs font-semibold uppercase">
                    Goods Receipts
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>GRN #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Posted At</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grnList.items.map(grn => (
                        <TableRow key={grn.id}>
                          <TableCell className="font-mono text-xs">{grn.grnNumber}</TableCell>
                          <TableCell>
                            <StatusBadge variant={grn.status === 'posted' ? 'success' : 'neutral'}>
                              {grn.status}
                            </StatusBadge>
                          </TableCell>
                          <TableCell>
                            {grn.postedAt ? formatDateTime(grn.postedAt) : 'Not posted yet'}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  justify="center"
                                >
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/goods-receipts/${grn.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Goods Receipt
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {po && (
        <GoodsReceiptDialog
          open={isGrnDialogOpen}
          onOpenChange={setIsGrnDialogOpen}
          purchaseOrder={po}
          draftGoodsReceipt={draftGrnDetail ?? null}
        />
      )}
    </div>
  );
}
