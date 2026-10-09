import { describe, expect, it } from "vitest";
import { cleanSource, isUsableNewsletterDraft, renderFallback } from "./newsletter";
import type { NewsletterDraft } from "./newsletter";

const baseDraft: NewsletterDraft = {
  titleOptions: ["Naslov"],
  subtitleOptions: ["Podnaslov"],
  hookOptions: ["Hook"],
  selectedTitle: "Naslov",
  selectedSubtitle: "Podnaslov",
  selectedHook: "Hook",
  excerpt: "Sažetak",
  html: "<p>Prvi odlomak s dovoljno sadržaja.</p><p>Drugi odlomak s dodatnim sadržajem.</p>",
};

describe("newsletter AI output checks", () => {
  it("rejects very short HTML for a long pasted source", () => {
    const source = Array.from({ length: 90 }, (_, i) => `riječ${i}`).join(" ");
    expect(isUsableNewsletterDraft({ ...baseDraft, html: "<p>Jedna riječ.</p>" }, source)).toBe(false);
  });

  it("keeps fallback content split into readable paragraphs", () => {
    const source = [
      "Prva rečenica opisuje problem u gradu. Druga rečenica dodaje kontekst i posljedice za građane. Treća rečenica traži odgovor.",
      "Novi odlomak donosi još jednu konkretnu temu i poziva gradsku vlast na transparentnost.",
    ].join("\n\n");

    const draft = renderFallback(source);
    expect(draft.html.match(/<p>/g)?.length).toBeGreaterThanOrEqual(2);
    expect(draft.html).toContain("Prva rečenica");
  });

  it("removes Facebook reaction paste noise", () => {
    expect(cleanSource("Dragica Pršo\n·\npoestrnSod1c 1 0f e 5 u 931ci2\nStvarni tekst")).toContain("Stvarni tekst");
  });
});
