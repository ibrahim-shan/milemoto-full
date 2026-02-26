import { check, sleep } from "k6";
import {
  addCartItem,
  authLogin,
  checkoutSubmitPayloadFromEnv,
  clearCart,
  getTaxPolicy,
  quoteCheckout,
  updateTaxPolicy,
} from "./_checkout-tax-helpers.js";

// Single-user smoke test for tax-policy engine behavior.
// It toggles tax policy settings, so do NOT run in parallel on shared environments.
//
// Requires:
// - CUSTOMER_EMAIL / CUSTOMER_PASSWORD
// - ADMIN_EMAIL / ADMIN_PASSWORD (settings.manage)
// - PRODUCT_VARIANT_ID
// - valid SHIPPING_* location env vars for a country that has tax rules
//
// Optional:
// - TEST_BLOCK_CHECKOUT_WITH_MISSING_COUNTRY=true (tests fallback block behavior)

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ["rate<0.05"],
  },
};

export function setup() {
  const baseUrl = __ENV.BASE_URL || "http://localhost:4000";
  const customerEmail = __ENV.CUSTOMER_EMAIL;
  const customerPassword = __ENV.CUSTOMER_PASSWORD;
  const adminEmail = __ENV.ADMIN_EMAIL;
  const adminPassword = __ENV.ADMIN_PASSWORD;
  const productVariantId = Number(__ENV.PRODUCT_VARIANT_ID || 0);
  const qty = Number(__ENV.CART_QTY || 1);

  if (!customerEmail || !customerPassword || !adminEmail || !adminPassword) {
    throw new Error("Set CUSTOMER_EMAIL/CUSTOMER_PASSWORD and ADMIN_EMAIL/ADMIN_PASSWORD.");
  }
  if (!productVariantId) {
    throw new Error("Set PRODUCT_VARIANT_ID.");
  }

  const customerToken = authLogin(baseUrl, customerEmail, customerPassword, "customer");
  const adminToken = authLogin(baseUrl, adminEmail, adminPassword, "admin");

  const currentPolicyRes = getTaxPolicy(baseUrl, adminToken);
  check(currentPolicyRes, { "get tax policy status 200": (r) => r.status === 200 });
  if (currentPolicyRes.status !== 200) {
    throw new Error(`Failed to fetch tax policy: ${currentPolicyRes.status}`);
  }

  clearCart(baseUrl, customerToken);
  const addRes = addCartItem(baseUrl, customerToken, productVariantId, qty);
  check(addRes, { "setup add cart item 201": (r) => r.status === 201 });

  const submitPayload = checkoutSubmitPayloadFromEnv();
  const quotePayload = {
    paymentMethodCode: submitPayload.paymentMethodCode,
    shippingMethodCode: submitPayload.shippingMethodCode,
    shippingAddress: submitPayload.shippingAddress,
    ...(submitPayload.billingAddress ? { billingAddress: submitPayload.billingAddress } : {}),
  };

  return {
    baseUrl,
    customerToken,
    adminToken,
    originalPolicy: currentPolicyRes.json(),
    quotePayload,
  };
}

export default function (data) {
  const { baseUrl, customerToken, adminToken, quotePayload } = data;

  // Force stack mode (baseline)
  const stackSetRes = updateTaxPolicy(baseUrl, adminToken, {
    combinationMode: "stack",
    fallbackMode: "no_tax",
  });
  check(stackSetRes, { "set stack/no_tax policy 200": (r) => r.status === 200 });

  const stackQuote = quoteCheckout(baseUrl, customerToken, quotePayload);
  const stackOk = check(stackQuote, {
    "stack quote status 200": (r) => r.status === 200,
    "stack quote taxLines array": (r) => Array.isArray(r.json("taxLines")),
  });
  if (!stackOk) {
    console.error(
      `stack quote failed: status=${stackQuote.status} body=${stackQuote.body || ""}`
    );
  }

  let stackTaxLinesCount = 0;
  if (stackOk) stackTaxLinesCount = (stackQuote.json("taxLines") || []).length;

  // Switch to exclusive mode
  const exclusiveSetRes = updateTaxPolicy(baseUrl, adminToken, {
    combinationMode: "exclusive",
    fallbackMode: "no_tax",
  });
  check(exclusiveSetRes, { "set exclusive/no_tax policy 200": (r) => r.status === 200 });

  const exclusiveQuote = quoteCheckout(baseUrl, customerToken, quotePayload);
  const exclusiveOk = check(exclusiveQuote, {
    "exclusive quote status 200": (r) => r.status === 200,
    "exclusive quote taxLines array": (r) => Array.isArray(r.json("taxLines")),
  });
  if (!exclusiveOk) {
    console.error(
      `exclusive quote failed: status=${exclusiveQuote.status} body=${exclusiveQuote.body || ""}`
    );
  }

  if (exclusiveOk) {
    const lines = exclusiveQuote.json("taxLines") || [];
    check(exclusiveQuote, {
      "exclusive returns <= 1 tax line": () => lines.length <= 1,
      "exclusive line count <= stack line count": () => lines.length <= stackTaxLinesCount,
    });
  }

  // Optional fallback block test (remove country from quote payload)
  if ((__ENV.TEST_BLOCK_CHECKOUT_WITH_MISSING_COUNTRY || "false").toLowerCase() === "true") {
    const blockSetRes = updateTaxPolicy(baseUrl, adminToken, {
      fallbackMode: "block_checkout",
    });
    check(blockSetRes, { "set block_checkout policy 200": (r) => r.status === 200 });

    const missingCountryPayload = JSON.parse(JSON.stringify(quotePayload));
    if (missingCountryPayload.shippingAddress) {
      delete missingCountryPayload.shippingAddress.countryId;
      delete missingCountryPayload.shippingAddress.country;
    }
    if (missingCountryPayload.billingAddress) {
      delete missingCountryPayload.billingAddress.countryId;
      delete missingCountryPayload.billingAddress.country;
    }

    const blockedQuote = quoteCheckout(baseUrl, customerToken, missingCountryPayload);
    check(blockedQuote, {
      "block_checkout quote returns 400": (r) => r.status === 400,
    });
  }

  sleep(1);
}

export function teardown(data) {
  if (!data?.originalPolicy || !data?.adminToken) return;

  const res = updateTaxPolicy(data.baseUrl, data.adminToken, data.originalPolicy);
  check(res, {
    "restore original tax policy status 200": (r) => r.status === 200,
  });
}
