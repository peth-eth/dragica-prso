import { describe, expect, it } from "vitest";
import { shouldRedirectToCanonicalHost } from "./canonical-host";

describe("shouldRedirectToCanonicalHost", () => {
  it("redirects non-canonical public hostnames", () => {
    expect(shouldRedirectToCanonicalHost("www.dragicaprso.hr")).toBe(true);
    expect(shouldRedirectToCanonicalHost("dragica-prso.pethereum.workers.dev")).toBe(true);
    expect(shouldRedirectToCanonicalHost("dragicaprso.hr")).toBe(false);
  });
});
