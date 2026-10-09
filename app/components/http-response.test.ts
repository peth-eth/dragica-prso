import { describe, expect, it } from "vitest";
import { parseJsonResponse } from "./http-response";

describe("parseJsonResponse", () => {
  it("handles an empty response without throwing", async () => {
    await expect(parseJsonResponse<{ error?: string }>(new Response())).resolves.toEqual({});
  });

  it("returns a readable error for invalid JSON", async () => {
    await expect(parseJsonResponse<{ error?: string }>(new Response("not json"))).resolves.toEqual({ error: "Server je vratio neispravan odgovor." });
  });
});
