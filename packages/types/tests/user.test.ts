import assert from "node:assert/strict";
import test from "node:test";

import { UserSchema } from "../src/api/index";

test("UserSchema accepts active/inactive/blocked and rejects disabled", () => {
  const base = {
    id: 1,
    email: "a@example.com",
    username: null,
    fullName: "A",
    phone: null,
    roleId: null,
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2025-12-01T00:00:00.000Z",
  };

  assert.equal(UserSchema.parse({ ...base, status: "active" }).status, "active");
  assert.equal(UserSchema.parse({ ...base, status: "inactive" }).status, "inactive");
  assert.equal(UserSchema.parse({ ...base, status: "blocked" }).status, "blocked");

  assert.throws(() => UserSchema.parse({ ...base, status: "disabled" }));
});
