'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import AddressForm, { Address } from './AddressForm';
import OrderSummary from './OrderSummary';
import PaymentMethod, { type Payment } from './PaymentMethod';
import { toast } from 'sonner';

import { useCart } from '@/features/cart/cart-context';
import { Skeleton } from '@/features/feedback/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { fetchCheckoutQuote, submitCheckout } from '@/lib/checkout';
import type { CheckoutQuoteResponse } from '@/types';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { Textarea } from '@/ui/textarea';

type CheckoutItemUi = {
  id: string;
  title: string;
  imageSrc: string;
  priceMinor: number;
  qty: number;
  warning?: string;
};

function moneyToMinor(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

function mapQuoteItems(quote: CheckoutQuoteResponse | null): CheckoutItemUi[] {
  if (!quote) return [];
  return quote.items.map(it => ({
    id: `${it.productSlug}::${it.productVariantId}`,
    title: it.variantName ? `${it.productName} (${it.variantName})` : it.productName,
    imageSrc: it.imageSrc ?? '/images/placeholder.png',
    priceMinor: moneyToMinor(it.unitPrice),
    qty: it.quantity,
    ...(it.warning ? { warning: it.warning } : {}),
  }));
}

function cloneAddress(value: Address): Address {
  return { ...value };
}

function formatAddressSummary(value: Address): string[] {
  const line1 = `${value.firstName} ${value.lastName}`.trim();
  const line2 = [value.address, value.addressLine2].filter(Boolean).join(', ');
  const line3 = [value.city, value.state, value.country].filter(Boolean).join(', ');
  const line4 = [value.postalCode, value.phone].filter(Boolean).join(' • ');
  const line5 = value.email.trim();
  return [line1, line2, line3, line4, line5].filter(x => x && x.trim().length > 0);
}

function hasMeaningfulAddress(value: Address): boolean {
  return Boolean(
    value.firstName ||
    value.lastName ||
    value.address ||
    value.countryId ||
    value.stateId ||
    value.cityId ||
    value.phone,
  );
}

function getCouponErrorMessage(errors: string[]): string | null {
  if (errors.includes('COUPON_EXPIRED')) return 'This coupon has expired.';
  if (errors.includes('COUPON_USAGE_LIMIT_REACHED')) return 'Coupon usage limit reached.';
  if (errors.includes('COUPON_MIN_SUBTOTAL_NOT_MET'))
    return 'Your cart subtotal does not meet this coupon minimum.';
  if (errors.includes('COUPON_NOT_STARTED')) return 'This coupon is not active yet.';
  if (errors.includes('COUPON_INVALID'))
    return 'Coupon code is invalid or not applicable to this cart.';
  return null;
}

export default function CheckoutClient() {
  const router = useRouter();
  const { clear: clearLocalCart } = useCart();
  const { loading: authLoading, isAuthenticated, user, updateUser } = useAuth();

  const [payment, setPayment] = React.useState<Payment>({ method: 'cod' });
  const [shipping, setShipping] = React.useState<Address>({
    firstName: '',
    lastName: '',
    address: '',
    addressLine2: '',
    postalCode: '',
    country: '',
    countryId: '',
    city: '',
    cityId: '',
    state: '',
    stateId: '',
    email: '',
    phone: '',
  });
  const [billing, setBilling] = React.useState<Address>({
    firstName: '',
    lastName: '',
    address: '',
    addressLine2: '',
    postalCode: '',
    country: '',
    countryId: '',
    city: '',
    cityId: '',
    state: '',
    stateId: '',
    email: '',
    phone: '',
  });
  const [sameAsShipping, setSameAsShipping] = React.useState(true);
  const [saveAddressToAccount, setSaveAddressToAccount] = React.useState(true);
  const [orderNotes, setOrderNotes] = React.useState('');
  const [editingShipping, setEditingShipping] = React.useState(true);
  const [billingTouched, setBillingTouched] = React.useState(false);

  const [quote, setQuote] = React.useState<CheckoutQuoteResponse | null>(null);
  const [loadingQuote, setLoadingQuote] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [applyingCoupon, setApplyingCoupon] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [couponCode, setCouponCode] = React.useState('');
  const [couponInput, setCouponInput] = React.useState('');
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [shippingPrefillReady, setShippingPrefillReady] = React.useState(false);
  const shippingRef = React.useRef(shipping);

  React.useEffect(() => {
    shippingRef.current = shipping;
  }, [shipping]);

  React.useEffect(() => {
    const saved = user?.defaultShippingAddress;
    if (!saved) {
      setShippingPrefillReady(true);
      return;
    }
    setShipping(prev => {
      const isEmpty =
        !prev.firstName &&
        !prev.lastName &&
        !prev.address &&
        !prev.countryId &&
        !prev.stateId &&
        !prev.cityId &&
        !prev.phone;
      if (!isEmpty) return prev;

      const parts = saved.fullName.trim().split(/\s+/);
      const firstName = parts[0] ?? '';
      const lastName = parts.slice(1).join(' ');

      return {
        ...prev,
        firstName,
        lastName,
        address: saved.addressLine1 ?? '',
        addressLine2: saved.addressLine2 ?? '',
        postalCode: saved.postalCode ?? '',
        country: saved.country ?? '',
        countryId: saved.countryId ? String(saved.countryId) : '',
        state: saved.state ?? '',
        stateId: saved.stateId ? String(saved.stateId) : '',
        city: saved.city ?? '',
        cityId: saved.cityId ? String(saved.cityId) : '',
        email: saved.email ?? prev.email,
        phone: saved.phone ?? '',
      };
    });
    setShippingPrefillReady(true);
  }, [user?.defaultShippingAddress]);

  React.useEffect(() => {
    setEditingShipping(!Boolean(user?.defaultShippingAddress));
  }, [user?.defaultShippingAddress]);

  React.useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/signin?next=/checkout');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadQuote = React.useCallback(
    async (nextCouponCode?: string) => {
      if (!isAuthenticated) return;
      setLoadingQuote(true);
      setAuthError(null);
      setCouponError(null);
      try {
        const currentShipping = shippingRef.current;
        const effectiveCouponCode =
          nextCouponCode !== undefined ? nextCouponCode.trim() : couponCode.trim();
        const quoteShippingAddress =
          currentShipping.country.trim() ||
          currentShipping.state.trim() ||
          currentShipping.city.trim() ||
          currentShipping.postalCode.trim()
            ? {
                ...(currentShipping.country.trim()
                  ? { country: currentShipping.country.trim() }
                  : {}),
                ...(currentShipping.countryId
                  ? { countryId: Number(currentShipping.countryId) }
                  : {}),
                ...(currentShipping.state.trim() ? { state: currentShipping.state.trim() } : {}),
                ...(currentShipping.stateId ? { stateId: Number(currentShipping.stateId) } : {}),
                ...(currentShipping.city.trim() ? { city: currentShipping.city.trim() } : {}),
                ...(currentShipping.cityId ? { cityId: Number(currentShipping.cityId) } : {}),
                ...(currentShipping.postalCode.trim()
                  ? { postalCode: currentShipping.postalCode.trim() }
                  : {}),
              }
            : undefined;
        const data = await fetchCheckoutQuote({
          paymentMethodCode: payment.method,
          ...(quoteShippingAddress ? { shippingAddress: quoteShippingAddress } : {}),
          ...(effectiveCouponCode ? { couponCode: effectiveCouponCode } : {}),
        });
        const nextCouponError = getCouponErrorMessage(data.errors ?? []);
        if (nextCouponError) {
          setCouponError(nextCouponError);
          setCouponCode('');
        } else if (effectiveCouponCode) {
          setCouponCode(effectiveCouponCode);
        }
        setQuote(data);
      } catch (err) {
        const e = err as { message?: string; status?: number; code?: string };
        const msg = (e?.message || '').toLowerCase();
        const code = (e?.code || '').toLowerCase();
        if (
          e?.status === 401 ||
          code === 'unauthorized' ||
          code === 'norefresh' ||
          msg.includes('auth')
        ) {
          setAuthError('Please sign in to continue checkout.');
        } else {
          toast.error(e?.message || 'Failed to load checkout summary');
        }
        setQuote(null);
      } finally {
        setLoadingQuote(false);
      }
    },
    [payment.method, isAuthenticated, couponCode],
  );

  React.useEffect(() => {
    if (authLoading || !isAuthenticated || !shippingPrefillReady) return;
    void loadQuote();
  }, [authLoading, isAuthenticated, shippingPrefillReady, loadQuote]);

  React.useEffect(() => {
    if (authLoading || !isAuthenticated || !shippingPrefillReady) return;
    const hasLocationSelection = Boolean(
      shipping.countryId || shipping.stateId || shipping.cityId || shipping.postalCode.trim(),
    );
    if (!hasLocationSelection) return;
    const timer = window.setTimeout(() => {
      void loadQuote();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [
    authLoading,
    isAuthenticated,
    shipping.countryId,
    shipping.stateId,
    shipping.cityId,
    shipping.postalCode,
    shippingPrefillReady,
    loadQuote,
  ]);

  React.useEffect(() => {
    if (sameAsShipping) return;
    if (billingTouched || hasMeaningfulAddress(billing)) return;
    setBilling(cloneAddress(shipping));
  }, [sameAsShipping, billingTouched, billing, shipping]);

  const items = React.useMemo(() => mapQuoteItems(quote), [quote]);
  const shippingSummaryLines = React.useMemo(() => formatAddressSummary(shipping), [shipping]);
  const showShippingSummary = Boolean(user?.defaultShippingAddress) && !editingShipping;

  const subtotalMinor = moneyToMinor(quote?.totals.subtotal);
  const discountMinor = moneyToMinor(quote?.totals.discountTotal);
  const shippingMinor = moneyToMinor(quote?.totals.shippingTotal);
  const taxMinor = moneyToMinor(quote?.totals.taxTotal);
  const totalMinor = moneyToMinor(quote?.totals.grandTotal);
  const taxLines = React.useMemo(
    () =>
      (quote?.taxLines ?? []).map(line => ({
        taxId: line.taxId,
        name: line.name,
        type: line.type,
        rate: line.rate,
        amountMinor: moneyToMinor(line.amount),
      })),
    [quote],
  );
  const checkoutErrors = React.useMemo(
    () =>
      (quote?.errors ?? []).filter(
        errorCode =>
          ![
            'COUPON_INVALID',
            'COUPON_EXPIRED',
            'COUPON_USAGE_LIMIT_REACHED',
            'COUPON_MIN_SUBTOTAL_NOT_MET',
            'COUPON_NOT_STARTED',
          ].includes(errorCode),
      ),
    [quote],
  );
  const canPlaceOrderIgnoringCouponErrors = React.useMemo(() => {
    if (!quote) return false;
    if (loadingQuote || authError) return false;
    return checkoutErrors.length === 0;
  }, [quote, loadingQuote, authError, checkoutErrors]);

  const validateShipping = React.useCallback(() => {
    if (!shipping.firstName.trim()) return 'First name is required.';
    if (!shipping.lastName.trim()) return 'Last name is required.';
    if (!shipping.address.trim()) return 'Address is required.';
    if (!shipping.countryId || !shipping.country.trim()) return 'Country is required.';
    if (!shipping.stateId || !shipping.state.trim()) return 'State is required.';
    if (!shipping.cityId || !shipping.city.trim()) return 'City is required.';
    if (!shipping.phone.trim()) return 'Phone is required.';
    if (shipping.email.trim() && !shipping.email.includes('@')) return 'Enter a valid email.';
    return null;
  }, [shipping]);

  const validateBilling = React.useCallback(() => {
    if (sameAsShipping) return null;
    if (!billing.firstName.trim()) return 'Billing first name is required.';
    if (!billing.lastName.trim()) return 'Billing last name is required.';
    if (!billing.address.trim()) return 'Billing address is required.';
    if (!billing.countryId || !billing.country.trim()) return 'Billing country is required.';
    if (!billing.stateId || !billing.state.trim()) return 'Billing state is required.';
    if (!billing.cityId || !billing.city.trim()) return 'Billing city is required.';
    if (!billing.phone.trim()) return 'Billing phone is required.';
    if (billing.email.trim() && !billing.email.includes('@')) return 'Enter a valid billing email.';
    return null;
  }, [sameAsShipping, billing]);

  const onPay = React.useCallback(async () => {
    if (submitting) return;
    const validationMsg = validateShipping();
    if (validationMsg) {
      toast.error(validationMsg);
      return;
    }
    const billingValidationMsg = validateBilling();
    if (billingValidationMsg) {
      toast.error(billingValidationMsg);
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitCheckout({
        paymentMethodCode: 'cod',
        shippingMethodCode: 'cod-default',
        ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
        shippingAddress: {
          fullName: `${shipping.firstName} ${shipping.lastName}`.trim(),
          phone: shipping.phone.trim(),
          ...(shipping.email.trim() ? { email: shipping.email.trim() } : {}),
          country: shipping.country.trim(),
          ...(shipping.countryId ? { countryId: Number(shipping.countryId) } : {}),
          state: shipping.state.trim(),
          ...(shipping.stateId ? { stateId: Number(shipping.stateId) } : {}),
          city: shipping.city.trim(),
          ...(shipping.cityId ? { cityId: Number(shipping.cityId) } : {}),
          addressLine1: shipping.address.trim(),
          ...(shipping.addressLine2.trim() ? { addressLine2: shipping.addressLine2.trim() } : {}),
          ...(shipping.postalCode.trim() ? { postalCode: shipping.postalCode.trim() } : {}),
        },
        ...(!sameAsShipping
          ? {
              billingAddress: {
                fullName: `${billing.firstName} ${billing.lastName}`.trim(),
                phone: billing.phone.trim(),
                ...(billing.email.trim() ? { email: billing.email.trim() } : {}),
                country: billing.country.trim(),
                ...(billing.countryId ? { countryId: Number(billing.countryId) } : {}),
                state: billing.state.trim(),
                ...(billing.stateId ? { stateId: Number(billing.stateId) } : {}),
                city: billing.city.trim(),
                ...(billing.cityId ? { cityId: Number(billing.cityId) } : {}),
                addressLine1: billing.address.trim(),
                ...(billing.addressLine2.trim()
                  ? { addressLine2: billing.addressLine2.trim() }
                  : {}),
                ...(billing.postalCode.trim() ? { postalCode: billing.postalCode.trim() } : {}),
              },
            }
          : {}),
        saveAddressToAccount,
        ...(orderNotes.trim() ? { notes: orderNotes.trim() } : {}),
      });

      if (saveAddressToAccount) {
        updateUser(prev =>
          prev
            ? {
                ...prev,
                defaultShippingAddress: {
                  fullName: `${shipping.firstName} ${shipping.lastName}`.trim(),
                  phone: shipping.phone.trim(),
                  email: shipping.email.trim() ? shipping.email.trim() : null,
                  country: shipping.country.trim(),
                  countryId: shipping.countryId ? Number(shipping.countryId) : null,
                  state: shipping.state.trim(),
                  stateId: shipping.stateId ? Number(shipping.stateId) : null,
                  city: shipping.city.trim(),
                  cityId: shipping.cityId ? Number(shipping.cityId) : null,
                  addressLine1: shipping.address.trim(),
                  addressLine2: shipping.addressLine2.trim() ? shipping.addressLine2.trim() : null,
                  postalCode: shipping.postalCode.trim() ? shipping.postalCode.trim() : null,
                },
              }
            : prev,
        );
      }

      clearLocalCart();
      toast.success(`Order ${result.orderNumber} placed successfully`);
      router.push(`/account/orders?placed=${result.orderId}`);
    } catch (err) {
      const e = err as { message?: string; status?: number; code?: string };
      const msg = (e?.message || '').toLowerCase();
      const code = (e?.code || '').toLowerCase();
      if (
        e?.status === 401 ||
        code === 'unauthorized' ||
        code === 'norefresh' ||
        msg.includes('auth')
      ) {
        setAuthError('Please sign in to continue checkout.');
      } else {
        toast.error(e?.message || 'Failed to place order');
      }
      void loadQuote();
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    validateShipping,
    validateBilling,
    shipping,
    billing,
    sameAsShipping,
    saveAddressToAccount,
    orderNotes,
    couponCode,
    updateUser,
    clearLocalCart,
    router,
    loadQuote,
  ]);

  const applyCoupon = React.useCallback(async () => {
    const nextCouponCode = couponInput.trim();
    if (!nextCouponCode) {
      setCouponCode('');
      setCouponError(null);
      setApplyingCoupon(true);
      try {
        await loadQuote('');
      } finally {
        setApplyingCoupon(false);
      }
      return;
    }
    setApplyingCoupon(true);
    try {
      await loadQuote(nextCouponCode);
    } finally {
      setApplyingCoupon(false);
    }
  }, [couponInput, loadQuote]);

  const removeCoupon = React.useCallback(async () => {
    setApplyingCoupon(true);
    setCouponCode('');
    setCouponInput('');
    setCouponError(null);
    try {
      await loadQuote('');
    } finally {
      setApplyingCoupon(false);
    }
  }, [loadQuote]);

  if (authLoading || !isAuthenticated) {
    return (
      <main className="container mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-border/60 bg-card text-muted-foreground rounded-2xl border p-6 text-sm">
          Redirecting to sign in...
        </div>
      </main>
    );
  }

  if (!shippingPrefillReady || (loadingQuote && !quote)) {
    return (
      <main className="container mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:px-8">
        <section className="space-y-6 lg:col-span-8">
          <div className="border-border/60 bg-card rounded-2xl border p-6">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </div>

          <div className="border-border/60 bg-card rounded-2xl border p-6">
            <Skeleton className="mb-4 h-6 w-36" />
            <Skeleton className="h-14 w-full" />
          </div>

          <div className="border-border/60 bg-card rounded-2xl border p-6">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-24 w-full" />
          </div>
        </section>

        <aside className="lg:col-span-4">
          <div className="border-border/60 bg-card rounded-2xl border p-6">
            <Skeleton className="mb-4 h-6 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-14 w-14 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </aside>
      </main>
    );
  }

  return (
    <main className="container mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:px-8">
      <section className="space-y-6 lg:col-span-8">
        <div className="border-border/60 bg-card rounded-2xl border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Shipping Address</h2>
            {showShippingSummary ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingShipping(true)}
              >
                Edit
              </Button>
            ) : user?.defaultShippingAddress ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingShipping(false)}
              >
                Use saved summary
              </Button>
            ) : null}
          </div>
          {showShippingSummary ? (
            <div className="border-border/60 bg-muted/20 rounded-xl border p-4">
              <div className="space-y-1 text-sm">
                {shippingSummaryLines.map((line, idx) => (
                  <p
                    key={`${idx}-${line}`}
                    className={idx === 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <AddressForm
              value={shipping}
              onChange={setShipping}
            />
          )}
          <div className="mt-4">
            <label
              htmlFor="order-notes"
              className="text-foreground mb-1 block text-sm"
            >
              Order Notes / Delivery Notes
              <span className="text-muted-foreground ml-1">(optional)</span>
            </label>
            <Textarea
              id="order-notes"
              value={orderNotes}
              onChange={e => setOrderNotes(e.target.value)}
              placeholder="Landmark, delivery instructions, or call-before-delivery notes (optional)"
              rows={3}
              maxLength={1000}
            />
          </div>
          <div className="border-border/60 bg-muted/20 mt-4 rounded-lg border p-3">
            <label
              htmlFor="save-address-account"
              className="flex cursor-pointer items-start gap-2 text-sm"
            >
              <Checkbox
                id="save-address-account"
                checked={saveAddressToAccount}
                onCheckedChange={checked => setSaveAddressToAccount(Boolean(checked))}
              />
              <span>
                Save this address to my account
                <span className="text-muted-foreground ml-1">
                  (used to prefill future checkout)
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="border-border/60 bg-card rounded-2xl border p-6">
          <h2 className="mb-4 text-lg font-semibold">Payment Method</h2>
          <PaymentMethod
            value={payment}
            onChange={setPayment}
          />
        </div>

        <div className="border-border/60 bg-card rounded-2xl border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Billing Address</h2>
            <label
              htmlFor="billing-same"
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={sameAsShipping}
                onCheckedChange={checked => {
                  const next = Boolean(checked);
                  setSameAsShipping(next);
                  if (!next && !billingTouched && !hasMeaningfulAddress(billing)) {
                    setBilling(cloneAddress(shipping));
                  }
                }}
                id="billing-same"
              />
              Same as shipping address
            </label>
          </div>

          {!sameAsShipping ? (
            <>
              <p className="text-muted-foreground mb-3 text-sm">
                Use a separate billing address for invoices.
              </p>
              <AddressForm
                value={billing}
                onChange={next => {
                  setBillingTouched(true);
                  setBilling(next);
                }}
              />
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Using shipping address for billing.</p>
          )}
        </div>
      </section>

      <aside className="lg:col-span-4">
        <OrderSummary
          items={items}
          subtotalMinor={subtotalMinor}
          discountMinor={discountMinor}
          shippingMinor={shippingMinor}
          taxMinor={taxMinor}
          taxLines={taxLines}
          totalMinor={totalMinor}
          warnings={quote?.warnings ?? []}
          errors={checkoutErrors}
          canPlaceOrder={canPlaceOrderIgnoringCouponErrors}
          submitting={submitting || loadingQuote || applyingCoupon}
          couponCode={couponCode}
          couponInput={couponInput}
          onCouponInputChange={value => {
            setCouponInput(value.toUpperCase());
            if (couponError) setCouponError(null);
          }}
          onApplyCoupon={applyCoupon}
          onRemoveCoupon={removeCoupon}
          couponApplying={applyingCoupon}
          couponError={couponError}
          onPay={onPay}
        />
      </aside>
    </main>
  );
}
