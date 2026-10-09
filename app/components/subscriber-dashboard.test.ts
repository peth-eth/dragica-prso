import { describe, expect, it } from "vitest";
import { formatDate } from "./subscriber-dashboard";

describe("subscriber dashboard dates", () => {
  it("formats both chart dates and Resend ISO contact timestamps", () => {
    expect(formatDate("2026-07-01")).toContain("2026");
    expect(formatDate("2026-07-01T10:00:00.000Z")).toContain("2026");
  });

  it("does not throw when a contact has an invalid date", () => {
    expect(formatDate("not-a-date")).toBe("Datum nije dostupan");
  });
});
