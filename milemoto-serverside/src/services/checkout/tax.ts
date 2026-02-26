import { and, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { taxes } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { getTaxPolicySettings } from '../siteSettings/read.js';

type TaxRuleRow = {
  id: number;
  name: string;
  type: 'percentage' | 'fixed';
  rate: number;
  countryId: number | null;
  validFrom: Date | string | null;
  validTo: Date | string | null;
};

export interface CheckoutTaxLine {
  taxId: number;
  name: string;
  type: 'percentage' | 'fixed';
  rate: number;
  countryId: number | null;
  amount: number;
}

export interface CheckoutTaxCalculation {
  taxableBase: number;
  taxLines: CheckoutTaxLine[];
  taxTotal: number;
}

function roundCurrency(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function normalizeAmount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value;
}

function selectExclusiveRule(rules: TaxRuleRow[]): TaxRuleRow[] {
  if (rules.length <= 1) return rules;

  const sorted = [...rules].sort((a, b) => {
    const aSpecificity = a.countryId == null ? 0 : 1;
    const bSpecificity = b.countryId == null ? 0 : 1;
    if (aSpecificity !== bSpecificity) return bSpecificity - aSpecificity;
    return a.id - b.id;
  });

  return sorted.slice(0, 1);
}

export async function resolveApplicableCheckoutTaxes(
  shippingCountryId?: number | null
): Promise<TaxRuleRow[]> {
  const now = new Date();
  const countryScope = shippingCountryId
    ? or(isNull(taxes.countryId), eq(taxes.countryId, shippingCountryId))
    : isNull(taxes.countryId);
  const effectiveNow = and(
    or(isNull(taxes.validFrom), lte(taxes.validFrom, now)),
    or(isNull(taxes.validTo), gte(taxes.validTo, now))
  );
  const where = and(eq(taxes.status, 'active'), countryScope, effectiveNow);

  const rows = await db
    .select({
      id: taxes.id,
      name: taxes.name,
      type: taxes.type,
      rate: taxes.rate,
      countryId: taxes.countryId,
      validFrom: taxes.validFrom,
      validTo: taxes.validTo,
    })
    .from(taxes)
    .where(where);

  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    type: r.type,
    rate: Number(r.rate),
    countryId: r.countryId == null ? null : Number(r.countryId),
    validFrom: r.validFrom ?? null,
    validTo: r.validTo ?? null,
  }));
}

export async function calculateCheckoutTaxes(input: {
  subtotal: number;
  discountTotal?: number;
  shippingTotal?: number;
  shippingCountryId?: number | null;
  billingCountryId?: number | null;
}): Promise<CheckoutTaxCalculation> {
  const policy = await getTaxPolicySettings();
  const subtotal = normalizeAmount(input.subtotal);
  const discountTotal = normalizeAmount(input.discountTotal ?? 0);
  const shippingTotal = normalizeAmount(input.shippingTotal ?? 0);
  const jurisdictionCountryId =
    policy.jurisdictionSource === 'billing_country'
      ? (input.billingCountryId ?? null)
      : (input.shippingCountryId ?? null);

  if (policy.fallbackMode === 'block_checkout' && jurisdictionCountryId == null) {
    throw httpError(
      400,
      'TaxJurisdictionRequired',
      `A ${policy.jurisdictionSource === 'billing_country' ? 'billing' : 'shipping'} country is required to calculate tax`
    );
  }

  const baseBeforeShipping =
    policy.taxableBaseMode === 'subtotal' ? subtotal : subtotal - discountTotal;
  const taxableBase = roundCurrency(
    Math.max(0, baseBeforeShipping + (policy.shippingTaxable ? shippingTotal : 0)),
    policy.roundingPrecision
  );

  const matchedRules = await resolveApplicableCheckoutTaxes(jurisdictionCountryId);
  const rules =
    policy.combinationMode === 'exclusive' ? selectExclusiveRule(matchedRules) : matchedRules;

  if (policy.fallbackMode === 'block_checkout' && rules.length === 0) {
    throw httpError(400, 'TaxRuleRequired', 'No active tax rule matches the current checkout');
  }

  const taxLines: CheckoutTaxLine[] = rules.map((rule) => {
    const rawAmount = rule.type === 'percentage' ? taxableBase * (rule.rate / 100) : rule.rate;
    return {
      taxId: rule.id,
      name: rule.name,
      type: rule.type,
      rate: rule.rate,
      countryId: rule.countryId,
      amount: roundCurrency(Math.max(0, rawAmount), policy.roundingPrecision),
    };
  });

  const taxTotal = roundCurrency(
    taxLines.reduce((sum, line) => sum + line.amount, 0),
    policy.roundingPrecision
  );
  return { taxableBase, taxLines, taxTotal };
}
