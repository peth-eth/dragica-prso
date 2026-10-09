import { describe, expect, it, vi } from "vitest";

const { getCloudflareContext } = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }));

import { hasGeminiApiKey } from "./gemini";

describe("Gemini Worker configuration", () => {
  it("reads the key from the Cloudflare runtime binding", async () => {
    getCloudflareContext.mockResolvedValue({ env: { GEMINI_API_KEY: "worker-secret" } });

    await expect(hasGeminiApiKey()).resolves.toBe(true);
  });
});
