import { check, sleep } from "k6";
import {
  addCartItem,
  assertQuoteMath,
  authLogin,
  checkoutSubmitPayloadFromEnv,
  clearCart,
  quoteCheckout,
} from "./_checkout-tax-helpers.js";

// Quote-focused load/perf test with tax assertions.
// Safer for load than submit because it does not create orders.
//
// PowerShell example:
// $env:BASE_URL="http://localhost:4000"
// $env:CUSTOMER_EMAIL="customer@example.com"; $env:CUSTOMER_PASSWORD="12345678"
// $env:PRODUCT_VARIANT_ID="1"; $env:CART_QTY="1"
// $env:SHIPPING_COUNTRY="Lebanon"; $env:SHIPPING_COUNTRY_ID="1"
// $env:SHIPPING_STATE="Beirut"; $env:SHIPPING_STATE_ID="1"
// $env:SHIPPING_CITY="Beirut"; $env:SHIPPING_CITY_ID="1"
// k6 run k6/checkout-quote-tax-load.js

export const options = {
  stages: [
    { duration: "30s", target: Number(__ENV.TARGET_VUS || 5) },
    { duration: "2m", target: Number(__ENV.TARGET_VUS || 5) },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1000", "p(99)<2000"],
  },
};

export function setup() {
  const baseUrl = __ENV.BASE_URL || "http://localhost:4000";
  const customerEmail = __ENV.CUSTOMER_EMAIL;
  const customerPassword = __ENV.CUSTOMER_PASSWORD;
  const productVariantId = Number(__ENV.PRODUCT_VARIANT_ID || 0);
  const qty = Number(__ENV.CART_QTY || 1);

  if (!customerEmail || !customerPassword) {
    throw new Error("Set CUSTOMER_EMAIL and CUSTOMER_PASSWORD.");
  }
  if (!productVariantId) {
    throw new Error("Set PRODUCT_VARIANT_ID.");
  }

  const customerToken = authLogin(baseUrl, customerEmail, customerPassword, "customer");
  clearCart(baseUrl, customerToken);
  const addRes = addCartItem(baseUrl, customerToken, productVariantId, qty);
  check(addRes, { "setup add cart item 201": (r) => r.status === 201 });

  const submitPayload = checkoutSubmitPayloadFromEnv();
  return {
    baseUrl,
    customerToken,
    quotePayload: {
      paymentMethodCode: submitPayload.paymentMethodCode,
      shippingMethodCode: submitPayload.shippingMethodCode,
      shippingAddress: submitPayload.shippingAddress,
      ...(submitPayload.billingAddress ? { billingAddress: submitPayload.billingAddress } : {}),
    },
  };
}

export default function (data) {
  const res = quoteCheckout(data.baseUrl, data.customerToken, data.quotePayload);

  const ok = check(res, {
    "quote status 200": (r) => r.status === 200,
    "quote canPlaceOrder true": (r) => Boolean(r.json("canPlaceOrder")) === true,
    "quote taxLines array": (r) => Array.isArray(r.json("taxLines")),
  });

  if (ok) {
    assertQuoteMath(res);
  } else {
    console.error(`quote failed: status=${res.status} body=${res.body || ""}`);
  }

  sleep(Number(__ENV.SLEEP_SECONDS || 1));
}

