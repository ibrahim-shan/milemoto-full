import assert from "node:assert/strict";
import test from "node:test";

import { CreateGoodsReceipt } from "../src/api/index";

test("CreateGoodsReceipt normalizes note + optional date-only fields", () => {
  const dto = CreateGoodsReceipt.parse({
    purchaseOrderId: 1,
    note: "  Received partial  ",
    lines: [
      {
        purchaseOrderLineId: 10,
        receivedQty: 5,
        rejectedQty: 0,
        batchNumber: "  B-1  ",
        expirationDate: "",
      },
    ],
  });

  assert.equal(dto.note, "Received partial");
  assert.equal(dto.lines[0].batchNumber, "B-1");
  assert.equal(dto.lines[0].expirationDate, undefined);
});

test("CreateGoodsReceipt rejects expirationDate datetime strings", () => {
  assert.throws(() =>
    CreateGoodsReceipt.parse({
      purchaseOrderId: 1,
      lines: [
        {
          purchaseOrderLineId: 10,
          receivedQty: 1,
          expirationDate: "2025-12-07T00:00:00.000Z",
        },
      ],
    })
  );
});

