import { describe, expect, it, vi } from "vitest";

const { tursoExecute } = vi.hoisted(() => ({
  tursoExecute: vi.fn(),
}));

vi.mock("@/lib/turso", () => ({
  tursoExecute,
  tursoBatch: vi.fn(),
}));

import { getSentNewsletters, getSuggestions } from "./db";

describe("getSentNewsletters", () => {
  it("only returns editions backed by a sent Resend broadcast", async () => {
    tursoExecute.mockResolvedValue({ rows: [], affected: 0, lastRowId: null });

    await getSentNewsletters();

    expect(tursoExecute).toHaveBeenCalledWith(
      expect.stringContaining("resend_broadcast_id IS NOT NULL")
    );
  });

  it("hides seeded example suggestions from the public feed", async () => {
    tursoExecute.mockResolvedValue({ rows: [], affected: 0, lastRowId: null });

    await getSuggestions();

    expect(tursoExecute).toHaveBeenCalledWith(
      expect.stringContaining("id NOT LIKE 's_seed_%'")
    );
  });
});
