import { describe, expect, it } from "vitest";
import { parseAllowedAdmins } from "./admin-email";

describe("parseAllowedAdmins", () => {
  it("normalizes comma-separated admin email addresses", () => {
    expect(parseAllowedAdmins(" First.Admin@Example.com, second.admin@example.com , ")).toEqual([
      "first.admin@example.com",
      "second.admin@example.com",
    ]);
  });
});
