import assert from "node:assert/strict";
import test from "node:test";

import {
  DateOnlyStringSchema,
  IsoDateTimeStringSchema,
  LowerTrimmedStringSchema,
  OptionalDateOnlyStringSchema,
  OptionalEmailSchema,
  TrimmedStringSchema,
  UpperTrimmedStringSchema,
} from "../src/api/index";

test("TrimmedStringSchema trims whitespace", () => {
  assert.equal(TrimmedStringSchema.parse("  Hello  "), "Hello");
});

test("LowerTrimmedStringSchema trims + lowercases", () => {
  assert.equal(LowerTrimmedStringSchema.parse("  HeLLo  "), "hello");
});

test("UpperTrimmedStringSchema trims + uppercases", () => {
  assert.equal(UpperTrimmedStringSchema.parse("  usd  "), "USD");
});

test("OptionalEmailSchema treats empty string as undefined and normalizes to lowercase", () => {
  assert.equal(OptionalEmailSchema.parse(""), undefined);
  assert.equal(OptionalEmailSchema.parse(null), undefined);
  assert.equal(OptionalEmailSchema.parse("  Test@Example.com "), "test@example.com");
});

test("DateOnlyStringSchema accepts YYYY-MM-DD and rejects datetime strings", () => {
  assert.equal(DateOnlyStringSchema.parse("2025-12-07"), "2025-12-07");
  assert.throws(() => DateOnlyStringSchema.parse("2025-12-07T00:00:00.000Z"));
  assert.throws(() => DateOnlyStringSchema.parse("2025/12/07"));
});

test("OptionalDateOnlyStringSchema treats empty string/null as undefined", () => {
  assert.equal(OptionalDateOnlyStringSchema.parse(""), undefined);
  assert.equal(OptionalDateOnlyStringSchema.parse(null), undefined);
  assert.equal(OptionalDateOnlyStringSchema.parse("2025-12-07"), "2025-12-07");
});

test("IsoDateTimeStringSchema accepts datetime ISO strings", () => {
  assert.equal(
    IsoDateTimeStringSchema.parse("2025-12-07T10:30:00.000Z"),
    "2025-12-07T10:30:00.000Z"
  );
  assert.throws(() => IsoDateTimeStringSchema.parse("2025-12-07"));
});

