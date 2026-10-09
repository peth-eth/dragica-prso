import { describe, expect, it } from "vitest";
import { buildSubscriberDirectory, buildSubscriberStats } from "./subscriber-stats";

describe("buildSubscriberStats", () => {
  it("creates a cumulative daily series using active subscribers only", () => {
    const stats = buildSubscriberStats([
      { email: "first@example.com", createdAt: "2026-07-01T10:00:00.000Z", unsubscribed: false },
      { email: "second@example.com", createdAt: "2026-07-01T16:00:00.000Z", unsubscribed: false },
      { email: "third@example.com", createdAt: "2026-07-03T09:00:00.000Z", unsubscribed: false },
      { email: "past@example.com", createdAt: "2026-07-02T09:00:00.000Z", unsubscribed: true },
    ], new Date("2026-07-03T12:00:00.000Z"));

    expect(stats.total).toBe(3);
    expect(stats.unsubscribed).toBe(1);
    expect(stats.growth).toEqual([
      { date: "2026-07-01", count: 2 },
      { date: "2026-07-02", count: 2 },
      { date: "2026-07-03", count: 3 },
    ]);
  });

  it("returns a newest-first searchable page of active subscribers", () => {
    const contacts = [
      { email: "ana@example.com", firstName: "Ana", createdAt: "2026-07-01T10:00:00.000Z", unsubscribed: false },
      { email: "marko@example.com", firstName: "Marko", createdAt: "2026-07-03T10:00:00.000Z", unsubscribed: false },
      { email: "old@example.com", createdAt: "2026-07-04T10:00:00.000Z", unsubscribed: true },
    ];

    expect(buildSubscriberDirectory(contacts, 1, 10, "mark")).toMatchObject({
      contacts: [{ email: "marko@example.com", name: "Marko" }],
      pagination: { total: 1, totalPages: 1 },
    });
  });
});
