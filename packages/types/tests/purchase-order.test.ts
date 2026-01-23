import assert from "node:assert/strict";
import test from "node:test";

import { CreatePurchaseOrder } from "../src/api/index";

test("CreatePurchaseOrder normalizes + coerces numeric fields", () => {
  const dto = CreatePurchaseOrder.parse({
    subject: "  PO 1  ",
    vendorId: 1,
    stockLocationId: 2,
    currencyId: 3,
    paymentTerms: "  Net 30  ",
    expectedDeliveryDate: "2025-12-07",
    paymentMethodId: 4,
    shippingMethod: "standard",
    shippingCost: "12.50",
    discountType: "percentage",
    discountValue: "10",
    internalNote: "  internal  ",
    lines: [
      {
        productVariantId: 10,
        orderedQty: 5,
        unitCost: "100",
        taxId: 7,
        expectedLineDeliveryDate: "2025-12-09",
        comments: "  line note  ",
      },
    ],
  });

  assert.equal(dto.subject, "PO 1");
  assert.equal(dto.paymentTerms, "Net 30");
  assert.equal(dto.internalNote, "internal");
  assert.equal(dto.shippingCost, 12.5);
  assert.equal(dto.discountValue, 10);
  assert.equal(dto.lines[0].unitCost, 100);
  assert.equal(dto.lines[0].comments, "line note");
});

test("CreatePurchaseOrder rejects expectedDeliveryDate datetime strings", () => {
  assert.throws(() =>
    CreatePurchaseOrder.parse({
      subject: "PO 1",
      vendorId: 1,
      stockLocationId: 2,
      currencyId: 3,
      paymentTerms: "Net 30",
      expectedDeliveryDate: "2025-12-07T00:00:00.000Z",
      paymentMethodId: 4,
      lines: [{ productVariantId: 10, orderedQty: 1, unitCost: 1 }],
    })
  );
});

