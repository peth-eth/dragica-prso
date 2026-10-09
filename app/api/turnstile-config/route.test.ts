import { describe, expect, it, vi } from "vitest";

const { getCloudflareContext } = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }));

import { GET } from "./route";

describe("Turnstile configuration route", () => {
  it("returns the public site key without caching", async () => {
    getCloudflareContext.mockResolvedValue({ env: { TURNSTILE_SITE_KEY: "public-key" } });

    const response = await GET();

    expect(await response.json()).toEqual({ siteKey: "public-key" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("does not expose a missing or non-string binding", async () => {
    getCloudflareContext.mockResolvedValue({ env: { TURNSTILE_SITE_KEY: undefined } });

    expect(await (await GET()).json()).toEqual({ siteKey: "" });
  });
});
