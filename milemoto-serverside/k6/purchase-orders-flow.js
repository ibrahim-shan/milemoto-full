import http from "k6/http";
import { check, sleep } from "k6";

// How to run (PowerShell):
// $env:BASE_URL="http://localhost:4000"; `
// $env:EMAIL="admin@gmail.com"; $env:PASSWORD="12345678"; `
// $env:VENDOR_ID="1"; $env:STOCK_LOCATION_ID="1"; $env:CURRENCY_ID="1"; `
// $env:VARIANT_ID="1"; $env:PAYMENT_METHOD_ID=""; $env:INBOUND_SHIPPING_METHOD_ID=""; `
// $env:TAX_ID=""; $env:SHIPPING_COST="0"; $env:DISCOUNT_TYPE="none"; $env:DISCOUNT_VALUE="0"; `
// k6 run k6/purchase-orders-flow.js
//
// Required IDs:
// VENDOR_ID, STOCK_LOCATION_ID, CURRENCY_ID, VARIANT_ID (must exist in DB).
// Optional IDs:
// PAYMENT_METHOD_ID, INBOUND_SHIPPING_METHOD_ID, TAX_ID (leave empty to omit).

export const options = {
  stages: [
    { duration: "30s", target: 5 },
    { duration: "2m", target: 10 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800", "p(99)<1500"],
  },
};

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function setup() {
  const baseUrl = __ENV.BASE_URL || "http://localhost:4000";
  const email = __ENV.EMAIL || "admin@gmail.com";
  const password = __ENV.PASSWORD || "12345678";

  const res = http.post(
    `${baseUrl}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(res, { "login status 200": (r) => r.status === 200 });

  const token = res.json("accessToken");
  return { baseUrl, accessToken: token };
}

export default function (data) {
  const baseUrl = data.baseUrl;
  const accessToken = data.accessToken;

  const vendorId = Number(__ENV.VENDOR_ID || 0);
  const stockLocationId = Number(__ENV.STOCK_LOCATION_ID || 0);
  const currencyId = Number(__ENV.CURRENCY_ID || 0);
  const variantId = Number(__ENV.VARIANT_ID || 0);

  if (!vendorId || !stockLocationId || !currencyId || !variantId) {
    console.error(
      "Missing required env vars: VENDOR_ID, STOCK_LOCATION_ID, CURRENCY_ID, VARIANT_ID"
    );
    sleep(1);
    return;
  }

  const paymentMethodId = Number(__ENV.PAYMENT_METHOD_ID || 0) || undefined;
  const taxId = Number(__ENV.TAX_ID || 0) || undefined;
  const inboundShippingMethodId =
    Number(__ENV.INBOUND_SHIPPING_METHOD_ID || 0) || undefined;
  const shippingCost = Number(__ENV.SHIPPING_COST || 0) || 0;

  const discountTypeRaw = (__ENV.DISCOUNT_TYPE || "none").toLowerCase();
  const discountType =
    discountTypeRaw === "fixed" || discountTypeRaw === "percentage"
      ? discountTypeRaw
      : "none";
  const discountValue =
    discountType === "none" ? undefined : Number(__ENV.DISCOUNT_VALUE || 0) || 0;

  const expectedDeliveryDate = toIsoDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  const payload = {
    subject: `Load Test PO ${Date.now()}`,
    vendorId,
    stockLocationId,
    currencyId,
    paymentTerms: "net 30",
    expectedDeliveryDate,
    shippingCost,
    discountType,
    discountValue,
    note: __ENV.NOTE || "k6 load test",
    lines: [
      {
        productVariantId: variantId,
        orderedQty: 2,
        unitCost: 100,
      },
    ],
  };

  if (paymentMethodId) payload.paymentMethodId = paymentMethodId;
  if (inboundShippingMethodId)
    payload.inboundShippingMethodId = inboundShippingMethodId;
  if (taxId) payload.lines[0].taxId = taxId;
  if (discountType === "none") delete payload.discountType;
  if (discountValue === undefined) delete payload.discountValue;

  const createRes = http.post(
    `${baseUrl}/api/v1/admin/purchase-orders`,
    JSON.stringify(payload),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const createdOk = check(createRes, {
    "po create status 201": (r) => r.status === 201,
  });

  if (!createdOk) {
    console.error("po create failed", {
      status: createRes.status,
      body: createRes.body,
    });
    sleep(1);
    return;
  }

  const poId = createRes.json("id");
  const submitRes = http.post(
    `${baseUrl}/api/v1/admin/purchase-orders/${poId}/submit`,
    null,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  check(submitRes, { "po submit status 200": (r) => r.status === 200 });

  const approveRes = http.post(
    `${baseUrl}/api/v1/admin/purchase-orders/${poId}/approve`,
    null,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  check(approveRes, { "po approve status 200": (r) => r.status === 200 });

  sleep(1);
}
