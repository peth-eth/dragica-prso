import { describe, expect, it } from "vitest";
import { selectAudienceId } from "./resend-audience";

describe("selectAudienceId", () => {
  it("uses the configured audience when it has active contacts", () => {
    expect(selectAudienceId("configured", [{ id: "configured", activeContacts: 7 }])).toBe("configured");
  });

  it("recovers the single non-empty audience when configuration is stale", () => {
    expect(selectAudienceId("empty", [{ id: "empty", activeContacts: 0 }, { id: "dragica", activeContacts: 7 }])).toBe("dragica");
  });

  it("does not guess when multiple alternative audiences contain contacts", () => {
    expect(selectAudienceId("empty", [{ id: "empty", activeContacts: 0 }, { id: "one", activeContacts: 2 }, { id: "two", activeContacts: 7 }])).toBe("empty");
  });
});
