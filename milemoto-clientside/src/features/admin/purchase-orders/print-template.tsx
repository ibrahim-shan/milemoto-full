import React from 'react';

import { formatCurrency, getVariantLabel } from './utils';
import type {
  BrandingSettingsDto,
  DocumentSettingsDto,
  PurchaseOrderResponse,
} from '@milemoto/types';
import { format } from 'date-fns';

// Define loose types for props to avoid strict Type issues on optional/missing fields
interface PrintVariant {
  id: number;
  sku: string;
  productName?: string;
  variantName?: string;
  name?: string;
}

interface PrintVendor {
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  phoneCode?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

interface PrintLocation {
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

interface Props {
  po: PurchaseOrderResponse;
  vendor: PrintVendor | undefined;
  location: PrintLocation | undefined;
  branding: BrandingSettingsDto | undefined;
  documents: DocumentSettingsDto | undefined;
  variants: PrintVariant[];
}

export const PurchaseOrderPrintTemplate = React.forwardRef<HTMLDivElement, Props>(
  ({ po, vendor, location, branding, documents, variants }, ref) => {
    return (
      <div
        ref={ref}
        className="text-foreground bg-background mx-auto h-screen p-8 print:p-4"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="w-1/2">
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="mb-4 h-16 w-auto object-contain"
              />
            ) : (
              <h1 className="text-2xl font-bold">PURCHASE ORDER</h1>
            )}
            <div className="text-sm">
              {location && (
                <>
                  <p className="font-bold">{location.name}</p>
                  <p>{location.address}</p>
                  <p>
                    {location.city}, {location.state} {location.postalCode}
                  </p>
                  <p>{location.country}</p>
                </>
              )}
            </div>
          </div>
          <div className="w-1/2 text-right">
            <h2 className="mb-2 text-3xl font-bold text-gray-800">PURCHASE ORDER</h2>
            <table className="ml-auto text-sm">
              <tbody>
                <tr>
                  <td className="pr-4 font-bold text-gray-600">PO Number:</td>
                  <td className="font-mono font-bold">{po.poNumber}</td>
                </tr>
                <tr>
                  <td className="pr-4 font-bold text-gray-600">Date:</td>
                  <td>{po.createdAt ? format(new Date(po.createdAt), 'PP') : '-'}</td>
                </tr>
                <tr>
                  <td className="pr-4 font-bold text-gray-600">Expected:</td>
                  <td>
                    {po.expectedDeliveryDate
                      ? format(new Date(po.expectedDeliveryDate), 'PP')
                      : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Addresses */}
        <div className="mb-8 grid grid-cols-2 gap-8 border-b border-t py-4">
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Vendor</h3>
            {vendor ? (
              <div className="text-sm">
                <p className="font-bold">{vendor.name}</p>
                {/* contactName removed as it does not exist on Vendor type */}
                <p>{vendor.email}</p>
                <p>
                  {vendor.phoneCode ? `${vendor.phoneCode} ` : ''}
                  {vendor.phoneNumber}
                </p>
                <p className="whitespace-pre-line text-xs">{vendor.address}</p>
                <p className="text-xs">
                  {vendor.city ? `${vendor.city}, ` : ''}
                  {vendor.state ? `${vendor.state} ` : ''}
                  {vendor.postalCode}
                </p>
                <p className="text-xs">{vendor.country}</p>
              </div>
            ) : (
              <p className="text-sm italic text-gray-500">No vendor details</p>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Ship To</h3>
            {location ? (
              <div className="text-sm">
                <p className="font-bold">{location.name}</p>
                <p>{location.address}</p>
                <p>
                  {location.city}, {location.state} {location.postalCode}
                </p>
                <p>{location.country}</p>
              </div>
            ) : (
              <p className="text-sm italic text-gray-500">No location details</p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="py-2 pr-4 font-bold uppercase">Item / Description</th>
                <th className="py-2 pr-4 text-right font-bold uppercase">Qty</th>
                <th className="py-2 pr-4 text-right font-bold uppercase">Unit Cost</th>
                <th className="py-2 text-right font-bold uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {po.lines && po.lines.length > 0 ? (
                po.lines.map(line => (
                  <tr
                    key={line.id}
                    className="border-b border-gray-200"
                  >
                    <td className="py-3 pr-4">
                      <p className="font-semibold">
                        {getVariantLabel(variants, line.productVariantId)}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono">{line.orderedQty}</td>
                    <td className="py-3 pr-4 text-right font-mono">
                      {formatCurrency(line.unitCost)}
                    </td>
                    <td className="py-3 text-right font-mono">
                      {formatCurrency(Number(line.unitCost) * line.orderedQty)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center italic text-gray-500"
                  >
                    No line items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mb-12 flex justify-end">
          <div className="min-w-50 w-1/3 space-y-2 text-sm">
            <div className="flex justify-between border-b pb-1">
              <span className="font-bold text-gray-600">Subtotal:</span>
              <span className="font-mono">{formatCurrency(po.subtotal)}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="font-bold text-gray-600">Discount:</span>
              <span className="font-mono text-red-600">-{formatCurrency(po.discountAmount)}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="font-bold text-gray-600">Tax:</span>
              <span className="font-mono">{formatCurrency(po.taxTotal)}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="font-bold text-gray-600">Shipping:</span>
              <span className="font-mono">{formatCurrency(po.shippingCost)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-gray-800 pt-1 text-base font-bold">
              <span>Total:</span>
              <span>
                {formatCurrency(
                  Number(po.subtotal || 0) -
                    Number(po.discountAmount || 0) +
                    Number(po.taxTotal || 0) +
                    Number(po.shippingCost || 0),
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Footer / Terms */}
        <div className="mt-auto pt-8">
          {documents?.purchaseOrderTerms && (
            <div className="mb-12">
              <h4 className="mb-2 text-xs font-bold uppercase text-gray-500">Terms & Conditions</h4>
              <p className="whitespace-pre-wrap text-xs text-gray-600">
                {documents.purchaseOrderTerms}
              </p>
            </div>
          )}

          <div className="mt-16 flex gap-12">
            <div className="w-1/2 border-t border-gray-400 pt-2">
              <p className="text-xs font-bold uppercase text-gray-500">Authorized Signature</p>
            </div>
            <div className="w-1/2 border-t border-gray-400 pt-2">
              <p className="text-xs font-bold uppercase text-gray-500">Date</p>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

PurchaseOrderPrintTemplate.displayName = 'PurchaseOrderPrintTemplate';
