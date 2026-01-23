'use client';

import { useMemo, useState } from 'react';

import type { CreatePurchaseOrderDto, PurchaseOrderResponse } from '@milemoto/types';

import { useGetActiveCurrencies } from '@/hooks/useCurrencyQueries';
import { useDebounce } from '@/hooks/useDebounce';
import { useDefaultCurrency } from '@/hooks/useDefaultCurrency';
import { useGetInboundShippingMethods } from '@/hooks/useInboundShippingMethodQueries';
import { useLocalizationFormat } from '@/hooks/useLocalizationFormat';
import { useGetPaymentMethods } from '@/hooks/usePaymentMethodQueries';
import { useGetAllProductVariants } from '@/hooks/useProductQueries';
import { useGetStoreCurrencySettings } from '@/hooks/useSiteSettingsQueries';
import { useGetStockLocations } from '@/hooks/useStockLocationQueries';
import { useGetTaxes } from '@/hooks/useTaxQueries';
import { useGetVendors } from '@/hooks/useVendorQueries';

import { LOOKUP_LIMIT, SEARCH_DEBOUNCE_MS } from '../constants';
import type { LineDraft, PurchaseOrderSummary } from '../types';

type UsePurchaseOrderFormArgs = {
  purchaseOrder?: PurchaseOrderResponse | null;
  onSubmit: (data: CreatePurchaseOrderDto) => Promise<void>;
  onClose: () => void;
  open?: boolean;
};

export function usePurchaseOrderForm({
  purchaseOrder,
  onSubmit,
  onClose,
  open,
}: UsePurchaseOrderFormArgs) {
  const isEnabled = open ?? true;
  const isEdit = !!purchaseOrder;
  const { data: storeCurrencySettings } = useGetStoreCurrencySettings({ enabled: isEnabled });

  const initialState = useMemo(() => {
    if (!purchaseOrder) {
      return {
        subject: '',
        vendorId: null,
        stockLocationId: null,
        currencyId: storeCurrencySettings?.defaultCurrencyId ?? null,
        paymentTerms: '',
        expectedDeliveryDate: '',
        paymentMethodId: null,
        discountType: undefined,
        discountValue: undefined,
        inboundShippingMethodId: null,
        shippingCost: undefined,
        note: '',
        lines: [] as LineDraft[],
      };
    }

    return {
      subject: purchaseOrder.subject,
      vendorId: purchaseOrder.vendorId,
      stockLocationId: purchaseOrder.stockLocationId,
      currencyId: purchaseOrder.currencyId,
      paymentTerms: purchaseOrder.paymentTerms,
      expectedDeliveryDate: purchaseOrder.expectedDeliveryDate ?? '',
      paymentMethodId: purchaseOrder.paymentMethodId,
      discountType: purchaseOrder.discountType ?? undefined,
      discountValue: purchaseOrder.discountValue ? Number(purchaseOrder.discountValue) : undefined,
      inboundShippingMethodId: purchaseOrder.inboundShippingMethodId ?? null,
      shippingCost: purchaseOrder.shippingCost ? Number(purchaseOrder.shippingCost) : undefined,
      note: purchaseOrder.internalNote ?? '',
      lines:
        purchaseOrder.lines?.map(line => ({
          id: String(line.id),
          productVariantId: line.productVariantId,
          orderedQty: line.orderedQty,
          unitCost: Number(line.unitCost),
          taxId: line.taxId,
        })) ?? [],
    };
  }, [purchaseOrder, storeCurrencySettings]);

  const [subject, setSubject] = useState(initialState.subject);
  const [vendorId, setVendorId] = useState<number | null>(initialState.vendorId);
  const [stockLocationId, setStockLocationId] = useState<number | null>(
    initialState.stockLocationId,
  );
  const [currencyId, setCurrencyId] = useState<number | null>(initialState.currencyId);
  const [paymentTerms, setPaymentTerms] = useState(initialState.paymentTerms);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    initialState.expectedDeliveryDate,
  );
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(
    initialState.paymentMethodId,
  );
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage' | undefined>(
    initialState.discountType,
  );
  const [discountValue, setDiscountValue] = useState<number | undefined>(
    initialState.discountValue,
  );
  const [inboundShippingMethodId, setInboundShippingMethodId] = useState<number | null>(
    initialState.inboundShippingMethodId,
  );
  const [shippingCost, setShippingCost] = useState<number | undefined>(initialState.shippingCost);
  const [note, setNote] = useState(initialState.note);

  const [lines, setLines] = useState<LineDraft[]>(initialState.lines);

  const [vendorSearch, setVendorSearch] = useState('');
  const [stockLocationSearch, setStockLocationSearch] = useState('');
  const [paymentMethodSearch, setPaymentMethodSearch] = useState('');
  const [inboundShippingSearch, setInboundShippingSearch] = useState('');
  const [taxSearch, setTaxSearch] = useState('');
  const [variantSearch, setVariantSearch] = useState('');

  const debouncedVendorSearch = useDebounce(vendorSearch, SEARCH_DEBOUNCE_MS);
  const debouncedStockLocationSearch = useDebounce(stockLocationSearch, SEARCH_DEBOUNCE_MS);
  const debouncedPaymentMethodSearch = useDebounce(paymentMethodSearch, SEARCH_DEBOUNCE_MS);
  const debouncedInboundShippingSearch = useDebounce(inboundShippingSearch, SEARCH_DEBOUNCE_MS);
  const debouncedTaxSearch = useDebounce(taxSearch, SEARCH_DEBOUNCE_MS);
  const debouncedVariantSearch = useDebounce(variantSearch, SEARCH_DEBOUNCE_MS);

  const { data: vendorsData } = useGetVendors(
    {
      page: 1,
      limit: LOOKUP_LIMIT,
      search: debouncedVendorSearch,
      status: 'active',
    },
    { enabled: isEnabled },
  );
  const { data: stockLocationsData } = useGetStockLocations(
    {
      page: 1,
      limit: LOOKUP_LIMIT,
      search: debouncedStockLocationSearch,
      status: 'active',
      type: undefined,
    },
    { enabled: isEnabled },
  );
  const { data: currenciesData } = useGetActiveCurrencies({ enabled: isEnabled });
  const { position, decimals } = useDefaultCurrency();
  const currencyPosition: 'before' | 'after' = position === 'after' ? 'after' : 'before';
  const { data: taxesData } = useGetTaxes(
    {
      search: debouncedTaxSearch,
      page: 1,
      limit: LOOKUP_LIMIT,
      status: 'active',
    },
    { enabled: isEnabled },
  );
  const { data: paymentMethodsData } = useGetPaymentMethods(
    {
      page: 1,
      limit: LOOKUP_LIMIT,
      search: debouncedPaymentMethodSearch,
      status: 'active',
    },
    { enabled: isEnabled },
  );
  const { data: inboundShippingMethodsData } = useGetInboundShippingMethods(
    {
      page: 1,
      limit: LOOKUP_LIMIT,
      search: debouncedInboundShippingSearch,
      status: 'active',
    },
    { enabled: isEnabled },
  );
  const { data: variantsData } = useGetAllProductVariants(
    {
      page: 1,
      limit: LOOKUP_LIMIT,
      search: debouncedVariantSearch,
    },
    { enabled: isEnabled },
  );

  const vendors = vendorsData?.items ?? [];
  const stockLocations = stockLocationsData?.items ?? [];
  const currencies = useMemo(() => currenciesData ?? [], [currenciesData]);
  const taxes = useMemo(() => taxesData?.items ?? [], [taxesData]);
  const paymentMethods = paymentMethodsData?.items ?? [];
  const inboundShippingMethods = inboundShippingMethodsData?.items ?? [];
  const variantItems = variantsData?.items ?? [];

  const resolvedCurrencyId = currencyId ?? storeCurrencySettings?.defaultCurrencyId ?? null;

  const selectedCurrency = useMemo(
    () =>
      resolvedCurrencyId
        ? (currencies.find(currency => currency.id === resolvedCurrencyId) ?? null)
        : null,
    [resolvedCurrencyId, currencies],
  );

  const summary: PurchaseOrderSummary = useMemo(() => {
    const validLines = lines.filter(l => l.productVariantId && l.orderedQty > 0 && l.unitCost >= 0);

    let totalQty = 0;
    let subtotal = 0;
    let taxTotal = 0;

    for (const line of validLines) {
      const lineSubtotal = line.orderedQty * line.unitCost;
      totalQty += line.orderedQty;
      subtotal += lineSubtotal;

      if (line.taxId) {
        const tax = taxes.find(t => t.id === line.taxId);
        if (tax) {
          if (tax.type === 'percentage') {
            taxTotal += (lineSubtotal * Number(tax.rate)) / 100;
          } else {
            taxTotal += Number(tax.rate) * line.orderedQty;
          }
        }
      }
    }

    let discountAmount = 0;
    if (discountType && typeof discountValue === 'number') {
      if (discountType === 'fixed') {
        discountAmount = discountValue;
      } else {
        discountAmount = (subtotal * discountValue) / 100;
      }
    }

    const shipping = shippingCost ?? 0;

    const totalBeforeTax = subtotal - discountAmount + shipping;
    const totalAfterTax = totalBeforeTax + taxTotal;

    const totalBeforeTaxDiscountShipping = subtotal;
    const totalAfterTaxDiscountShipping = subtotal - discountAmount + shipping + taxTotal;

    return {
      totalQty,
      subtotal,
      discountAmount,
      shipping,
      taxTotal,
      totalBeforeTax,
      totalAfterTax,
      totalBeforeTaxDiscountShipping,
      totalAfterTaxDiscountShipping,
    };
  }, [lines, taxes, discountType, discountValue, shippingCost]);

  const isDirty = useMemo(() => {
    if (!isEdit || !initialState) {
      return true;
    }

    const current = {
      subject,
      vendorId,
      stockLocationId,
      currencyId,
      paymentTerms,
      expectedDeliveryDate,
      paymentMethodId,
      discountType,
      discountValue,
      inboundShippingMethodId,
      shippingCost,
      note,
      lines: lines.map(l => ({
        productVariantId: l.productVariantId,
        orderedQty: l.orderedQty,
        unitCost: l.unitCost,
        taxId: l.taxId,
      })),
    };

    const initialComparable = {
      subject: initialState.subject,
      vendorId: initialState.vendorId,
      stockLocationId: initialState.stockLocationId,
      currencyId: initialState.currencyId,
      paymentTerms: initialState.paymentTerms,
      expectedDeliveryDate: initialState.expectedDeliveryDate,
      paymentMethodId: initialState.paymentMethodId,
      discountType: initialState.discountType,
      discountValue: initialState.discountValue,
      inboundShippingMethodId: initialState.inboundShippingMethodId,
      shippingCost: initialState.shippingCost,
      note: initialState.note,
      lines: initialState.lines.map(l => ({
        productVariantId: l.productVariantId,
        orderedQty: l.orderedQty,
        unitCost: l.unitCost,
        taxId: l.taxId,
      })),
    };

    return JSON.stringify(current) !== JSON.stringify(initialComparable);
  }, [
    isEdit,
    initialState,
    subject,
    vendorId,
    stockLocationId,
    currencyId,
    paymentTerms,
    expectedDeliveryDate,
    paymentMethodId,
    discountType,
    discountValue,
    inboundShippingMethodId,
    shippingCost,
    note,
    lines,
  ]);

  const handleAddLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        productVariantId: null,
        orderedQty: 1,
        unitCost: 0,
        taxId: null,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    setLines(prev => prev.filter(line => line.id !== id));
  };

  const updateLine = (
    id: string,
    patch: Partial<Pick<LineDraft, 'productVariantId' | 'orderedQty' | 'unitCost' | 'taxId'>>,
  ) => {
    setLines(prev => prev.map(line => (line.id === id ? { ...line, ...patch } : line)));
  };

  const handleVendorChange = (val: string | number) => {
    setVendorId(Number(val));
    setVendorSearch('');
  };

  const handleStockLocationChange = (val: string | number) => {
    setStockLocationId(Number(val));
    setStockLocationSearch('');
  };

  const handlePaymentMethodChange = (val: string | number) => {
    if (val === 'none') {
      setPaymentMethodId(null);
    } else {
      setPaymentMethodId(Number(val));
    }
    setPaymentMethodSearch('');
  };

  const handleInboundShippingMethodChange = (val: string | number) => {
    if (val === 'none') {
      setInboundShippingMethodId(null);
      setShippingCost(undefined);
    } else {
      setInboundShippingMethodId(Number(val));
    }
    setInboundShippingSearch('');
  };

  const handleCurrencyChange = (val: string | number) => {
    setCurrencyId(Number(val));
  };

  const handleLineVariantChange = (id: string, val: string | number) => {
    updateLine(id, { productVariantId: Number(val) });
    setVariantSearch('');
  };

  const handleLineTaxChange = (id: string, val: string | number) => {
    updateLine(id, { taxId: val === 'none' ? null : Number(val) });
    setTaxSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedCurrencyId = resolvedCurrencyId;

    if (!vendorId || !stockLocationId || !selectedCurrencyId || !paymentMethodId) {
      return;
    }

    const validLines = lines.filter(l => l.productVariantId && l.orderedQty > 0 && l.unitCost >= 0);

    if (validLines.length === 0) {
      return;
    }

    const payload: CreatePurchaseOrderDto = {
      subject,
      vendorId,
      stockLocationId,
      currencyId: selectedCurrencyId,
      paymentTerms,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      paymentMethodId,
      inboundShippingMethodId: inboundShippingMethodId ?? undefined,
      shippingCost,
      supplierRef: undefined,
      internalNote: note || undefined,
      discountType,
      discountValue,
      lines: validLines.map(l => ({
        productVariantId: l.productVariantId as number,
        orderedQty: l.orderedQty,
        unitCost: l.unitCost,
        taxId: l.taxId ?? undefined,
      })),
    };

    await onSubmit(payload);
    onClose();
  };

  const { formatDate, toDateInputValue } = useLocalizationFormat();
  const selectedDeliveryDate = expectedDeliveryDate
    ? new Date(`${toDateInputValue(expectedDeliveryDate)}T00:00:00`)
    : undefined;
  const deliveryLabel = expectedDeliveryDate ? formatDate(expectedDeliveryDate) : 'Pick a date';

  const handleDeliverySelect = (date?: Date) => {
    setExpectedDeliveryDate(date ? toDateInputValue(date) : '');
    setDeliveryOpen(false);
  };

  const title = isEdit ? 'Edit Purchase Order' : 'Add Purchase Order';
  const description = isEdit
    ? 'Update purchase order details and lines.'
    : 'Fill in the details to create a new purchase order.';

  return {
    isEdit,
    title,
    description,
    isDirty,
    handleSubmit,
    subject,
    setSubject,
    paymentTerms,
    setPaymentTerms,
    expectedDeliveryDate,
    setExpectedDeliveryDate,
    deliveryOpen,
    setDeliveryOpen,
    deliveryLabel,
    selectedDeliveryDate,
    handleDeliverySelect,
    currencyId,
    resolvedCurrencyId,
    handleCurrencyChange,
    vendorId,
    stockLocationId,
    paymentMethodId,
    inboundShippingMethodId,
    shippingCost,
    note,
    discountType,
    discountValue,
    lines,
    vendors,
    stockLocations,
    currencies,
    paymentMethods,
    inboundShippingMethods,
    taxes,
    variantItems,
    vendorSearch,
    setVendorSearch,
    stockLocationSearch,
    setStockLocationSearch,
    paymentMethodSearch,
    setPaymentMethodSearch,
    inboundShippingSearch,
    setInboundShippingSearch,
    taxSearch,
    setTaxSearch,
    variantSearch,
    setVariantSearch,
    setDiscountType,
    setDiscountValue,
    setShippingCost,
    setNote,
    handleAddLine,
    handleRemoveLine,
    updateLine,
    handleVendorChange,
    handleStockLocationChange,
    handlePaymentMethodChange,
    handleInboundShippingMethodChange,
    handleLineVariantChange,
    handleLineTaxChange,
    summary,
    selectedCurrency,
    currencyPosition,
    decimals,
  };
}
