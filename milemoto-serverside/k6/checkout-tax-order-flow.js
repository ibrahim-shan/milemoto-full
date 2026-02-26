import { check, sleep } from "k6";
import {
  addCartItem,
  assertQuoteMath,
  authLogin,
  checkoutSubmitPayloadFromEnv,
  clearCart,
  getAdminOrderById,
  getCustomerOrderById,
  getCustomerOrders,
  quoteCheckout,
  roundMoney,
  submitCheckout,
} from "./_checkout-tax-helpers.js";

// End-to-end correctness smoke for checkout tax + order snapshot.
// It creates a real order, so run with low VUs (usually 1).
//
// PowerShell example:
// $env:BASE_URL="http://localhost:4000"
// $env:CUSTOMER_EMAIL="customer@example.com"; $env:CUSTOMER_PASSWORD="12345678"
// $env:PRODUCT_VARIANT_ID="1"; $env:CART_QTY="1"
// $env:SHIPPING_COUNTRY="Lebanon"; $env:SHIPPING_COUNTRY_ID="1"
// $env:SHIPPING_STATE="Beirut"; $env:SHIPPING_STATE_ID="1"
// $env:SHIPPING_CITY="Beirut"; $env:SHIPPING_CITY_ID="1"
// k6 run k6/checkout-tax-order-flow.js
//
// Optional admin verification:
// $env:ADMIN_EMAIL="admin@gmail.com"; $env:ADMIN_PASSWORD="12345678"

export const options = {
  vus: Number(__ENV.VUS) || 1,
  iterations: Number(__ENV.ITERATIONS) || 1,
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || "http://localhost:4000";
  const customerEmail = __ENV.CUSTOMER_EMAIL;
  const customerPassword = __ENV.CUSTOMER_PASSWORD;
  const productVariantId = Number(__ENV.PRODUCT_VARIANT_ID || 0);
  const qty = Number(__ENV.CART_QTY || 1);

  if (!customerEmail || !customerPassword) {
    throw new Error("Set CUSTOMER_EMAIL and CUSTOMER_PASSWORD.");
  }
  if (!productVariantId) {
    throw new Error("Set PRODUCT_VARIANT_ID to a valid product variant id.");
  }

  const customerToken = authLogin(baseUrl, customerEmail, customerPassword, "customer");

  clearCart(baseUrl, customerToken);
  const addRes = addCartItem(baseUrl, customerToken, productVariantId, qty);
  if (addRes.status !== 201) {
    console.error(`add cart item failed: ${addRes.status} ${addRes.body || ""}`);
    return;
  }

  const submitPayload = checkoutSubmitPayloadFromEnv();
  const quotePayload = {
    paymentMethodCode: submitPayload.paymentMethodCode,
    shippingMethodCode: submitPayload.shippingMethodCode,
    shippingAddress: submitPayload.shippingAddress,
    ...(submitPayload.billingAddress ? { billingAddress: submitPayload.billingAddress } : {}),
  };

  const quoteRes = quoteCheckout(baseUrl, customerToken, quotePayload);
  const quoteOk = check(quoteRes, {
    "quote status 200": (r) => r.status === 200,
    "quote has totals": (r) => !!r.json("totals"),
    "quote has taxLines array": (r) => Array.isArray(r.json("taxLines")),
  });
  if (!quoteOk) {
    console.error(`quote failed: ${quoteRes.status} ${quoteRes.body || ""}`);
    return;
  }

  const quoteMath = assertQuoteMath(quoteRes);
  const quoteCanPlace = Boolean(quoteRes.json("canPlaceOrder"));
  check(quoteRes, { "quote can place order": () => quoteCanPlace });
  if (!quoteCanPlace) {
    console.error(`quote canPlaceOrder=false body=${quoteRes.body || ""}`);
    return;
  }

  const submitRes = submitCheckout(baseUrl, customerToken, submitPayload);
  const submitOk = check(submitRes, {
    "submit status 201": (r) => r.status === 201,
    "submit has orderId": (r) => Number(r.json("orderId")) > 0,
    "submit has orderNumber": (r) => !!r.json("orderNumber"),
  });
  if (!submitOk) {
    console.error(`submit failed: ${submitRes.status} ${submitRes.body || ""}`);
    return;
  }

  const orderId = Number(submitRes.json("orderId"));

  const ordersRes = getCustomerOrders(baseUrl, customerToken);
  check(ordersRes, {
    "customer orders list status 200": (r) => r.status === 200,
    "customer orders list includes new order": (r) => {
      const items = r.json("items") || [];
      return Array.isArray(items) && items.some((it) => Number(it.id) === orderId);
    },
  });

  const orderDetailRes = getCustomerOrderById(baseUrl, customerToken, orderId);
  const detailOk = check(orderDetailRes, {
    "customer order detail status 200": (r) => r.status === 200,
    "order detail taxLines array": (r) => Array.isArray(r.json("taxLines")),
  });
  if (!detailOk) {
    console.error(
      `order detail failed: ${orderDetailRes.status} ${orderDetailRes.body || ""}`
    );
    return;
  }

  const orderTaxTotal = roundMoney(Number(orderDetailRes.json("taxTotal") || 0));
  const orderTaxLines = orderDetailRes.json("taxLines") || [];
  const orderTaxLinesSum = roundMoney(
    orderTaxLines.reduce(
      (sum, line) => sum + Number(line.taxAmount ?? line.amount ?? 0),
      0
    )
  );

  const orderSnapshotSumCheck = check(orderDetailRes, {
    "order snapshot taxLines sum == order taxTotal": () => orderTaxLinesSum === orderTaxTotal,
    "order taxTotal matches quote taxTotal": () => orderTaxTotal === quoteMath.taxTotal,
  });
  if (!orderSnapshotSumCheck) {
    console.error(
      `order tax snapshot mismatch: taxTotal=${orderTaxTotal} taxLinesSum=${orderTaxLinesSum} taxLines=${JSON.stringify(orderTaxLines)}`
    );
  }

  const adminEmail = __ENV.ADMIN_EMAIL;
  const adminPassword = __ENV.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const adminToken = authLogin(baseUrl, adminEmail, adminPassword, "admin");
    const adminOrderRes = getAdminOrderById(baseUrl, adminToken, orderId);
    check(adminOrderRes, {
      "admin order detail status 200": (r) => r.status === 200,
      "admin order detail taxLines array": (r) => Array.isArray(r.json("taxLines")),
      "admin order detail taxTotal matches customer": (r) =>
        roundMoney(Number(r.json("taxTotal") || 0)) === orderTaxTotal,
    });
  }

  sleep(1);
}
