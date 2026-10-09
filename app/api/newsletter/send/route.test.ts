import { afterEach, describe, expect, it, vi } from "vitest";

const { auth, getNewsletterById, markNewsletterSent, sendBroadcast } = vi.hoisted(() => ({
  auth: vi.fn(),
  getNewsletterById: vi.fn(),
  markNewsletterSent: vi.fn(),
  sendBroadcast: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/db", () => ({ getNewsletterById, markNewsletterSent }));
vi.mock("@/lib/resend", () => ({ sendBroadcast }));

import { POST } from "./route";

describe("newsletter send", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns JSON when the broadcast provider fails", async () => {
    auth.mockResolvedValue({ user: { email: "admin@example.com" } });
    getNewsletterById.mockResolvedValue({ id: "newsletter-1", status: "draft", title: "Naslov", contentHtml: "<p>Tekst</p>", excerpt: null });
    sendBroadcast.mockRejectedValue(new Error("Provider unavailable"));

    const response = await POST(new Request("https://example.test/api/newsletter/send", {
      method: "POST",
      body: JSON.stringify({ newsletterId: "newsletter-1" }),
    }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Slanje glasnika nije uspjelo: Provider unavailable" });
    expect(markNewsletterSent).not.toHaveBeenCalled();
  });
});
