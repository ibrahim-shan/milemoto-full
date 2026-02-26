import http from "k6/http";
import { check } from "k6";

function stripNullishDeep(value) {
  if (Array.isArray(value)) {
    return value.map(stripNullishDeep);
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (child === null || child === undefined) continue;
      out[key] = stripNullishDeep(child);
    }
    return out;
  }
  return value;
}

export function jsonHeaders(accessToken) {
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export function authLogin(baseUrl, email, password, label = "user") {
  const res = http.post(
    `${baseUrl}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: jsonHeaders() }
  );

  check(res, {
    [`${label} login status 200`]: (r) => r.status === 200,
    [`${label} login has token`]: (r) => !!r.json("accessToken"),
  });

  if (res.status !== 200) {
    throw new Error(`${label} login failed: ${res.status} ${res.body || ""}`);
  }

  return res.json("accessToken");
}

export function clearCart(baseUrl, accessToken) {
  const res = http.del(`${baseUrl}/api/v1/cart`, null, {
    headers: jsonHeaders(accessToken),
  });
  check(res, { "clear cart status 200": (r) => r.status === 200 });
  return res;
}

export function addCartItem(baseUrl, accessToken, productVariantId, quantity) {
  const res = http.post(
    `${baseUrl}/api/v1/cart/items`,
    JSON.stringify({ productVariantId, quantity }),
    { headers: jsonHeaders(accessToken) }
  );
  check(res, {
    "add cart item status 201": (r) => r.status === 201,
  });
  return res;
}

export function quoteCheckout(baseUrl, accessToken, payload) {
  return http.post(
    `${baseUrl}/api/v1/checkout/quote`,
    JSON.stringify(stripNullishDeep(payload)),
    { headers: jsonHeaders(accessToken) }
  );
}

export function submitCheckout(baseUrl, accessToken, payload) {
  return http.post(
    `${baseUrl}/api/v1/checkout/submit`,
    JSON.stringify(stripNullishDeep(payload)),
    { headers: jsonHeaders(accessToken) }
  );
}

export function getCustomerOrders(baseUrl, accessToken) {
  return http.get(`${baseUrl}/api/v1/orders?page=1&limit=10`, {
    headers: jsonHeaders(accessToken),
  });
}

export function getCustomerOrderById(baseUrl, accessToken, orderId) {
  return http.get(`${baseUrl}/api/v1/orders/${orderId}`, {
    headers: jsonHeaders(accessToken),
  });
}

export function getAdminOrderById(baseUrl, accessToken, orderId) {
  return http.get(`${baseUrl}/api/v1/admin/orders/${orderId}`, {
    headers: jsonHeaders(accessToken),
  });
}

export function getTaxPolicy(baseUrl, adminToken) {
  return http.get(`${baseUrl}/api/v1/admin/site-settings/tax-policy`, {
    headers: jsonHeaders(adminToken),
  });
}

export function updateTaxPolicy(baseUrl, adminToken, patch) {
  return http.put(
    `${baseUrl}/api/v1/admin/site-settings/tax-policy`,
    JSON.stringify(patch),
    { headers: jsonHeaders(adminToken) }
  );
}

export function sumTaxLines(taxLines) {
  if (!Array.isArray(taxLines)) return 0;
  return taxLines.reduce((sum, line) => sum + Number(line?.amount ?? line?.taxAmount ?? 0), 0);
}

export function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function assertQuoteMath(res) {
  const taxLines = res.json("taxLines") || [];
  const subtotal = Number(res.json("totals.subtotal") || 0);
  const discountTotal = Number(res.json("totals.discountTotal") || 0);
  const shippingTotal = Number(res.json("totals.shippingTotal") || 0);
  const taxTotal = Number(res.json("totals.taxTotal") || 0);
  const grandTotal = Number(res.json("totals.grandTotal") || 0);

  const taxLinesTotal = roundMoney(
    taxLines.reduce((sum, line) => sum + Number(line.amount || 0), 0)
  );
  const expectedGrand = roundMoney(subtotal - discountTotal + shippingTotal + taxTotal);

  check(res, {
    "quote taxLines sum == taxTotal": () => taxLinesTotal === roundMoney(taxTotal),
    "quote grand total math valid": () => expectedGrand === roundMoney(grandTotal),
  });

  return {
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal: roundMoney(taxTotal),
    grandTotal: roundMoney(grandTotal),
    taxLinesCount: taxLines.length,
    taxLinesTotal,
  };
}

export function baseAddressFromEnv(prefix = "SHIPPING") {
  return {
    fullName: __ENV[`${prefix}_FULL_NAME`] || "k6 Customer",
    phone: __ENV[`${prefix}_PHONE`] || "700000000",
    email: __ENV[`${prefix}_EMAIL`] || undefined,
    country: __ENV[`${prefix}_COUNTRY`] || "Test Country",
    countryId: Number(__ENV[`${prefix}_COUNTRY_ID`] || 0) || undefined,
    state: __ENV[`${prefix}_STATE`] || "Test State",
    stateId: Number(__ENV[`${prefix}_STATE_ID`] || 0) || undefined,
    city: __ENV[`${prefix}_CITY`] || "Test City",
    cityId: Number(__ENV[`${prefix}_CITY_ID`] || 0) || undefined,
    addressLine1: __ENV[`${prefix}_ADDRESS1`] || "Test street 1",
    addressLine2: __ENV[`${prefix}_ADDRESS2`] || undefined,
    postalCode: __ENV[`${prefix}_POSTAL_CODE`] || "0000",
  };
}

export function checkoutSubmitPayloadFromEnv() {
  const shippingAddress = baseAddressFromEnv("SHIPPING");
  const billingSame = (__ENV.BILLING_SAME_AS_SHIPPING || "true").toLowerCase() !== "false";

  const payload = {
    paymentMethodCode: "cod",
    shippingMethodCode: __ENV.SHIPPING_METHOD_CODE || "cod-default",
    shippingAddress,
    saveAddressToAccount: (__ENV.SAVE_ADDRESS_TO_ACCOUNT || "false").toLowerCase() === "true",
  };

  if (!billingSame) {
    payload.billingAddress = baseAddressFromEnv("BILLING");
  }

  return payload;
}
