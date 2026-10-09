import { afterEach, describe, expect, it, vi } from "vitest";

const { addSubscriber, insertSuggestion, verifyTurnstile } = vi.hoisted(() => ({
  addSubscriber: vi.fn(),
  insertSuggestion: vi.fn(),
  verifyTurnstile: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ insertSuggestion }));
vi.mock("@/lib/resend", () => ({
  addSubscriber,
  isAlreadySubscribedError: () => false,
}));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile }));

import { POST } from "./route";

describe("public signup submission", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("subscribes an email-only visitor without creating a suggestion", async () => {
    verifyTurnstile.mockResolvedValue(true);
    addSubscriber.mockResolvedValue(undefined);

    const response = await POST(new Request("https://example.test/api/public-submit", {
      method: "POST",
      body: JSON.stringify({ email: "citizen@example.com", turnstileToken: "token" }),
    }));

    expect(response.status).toBe(200);
    expect(addSubscriber).toHaveBeenCalledWith("citizen@example.com", undefined);
    expect(insertSuggestion).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      message: "Hvala! Uspješno ste prijavljeni na Dragičin glasnik.",
    });
  });
});
