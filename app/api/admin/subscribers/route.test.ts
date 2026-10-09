import { describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
const { getSubscriberDashboard } = vi.hoisted(() => ({ getSubscriberDashboard: vi.fn() }));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/resend", () => ({ getSubscriberDashboard }));

import { GET } from "./route";

describe("GET /api/admin/subscribers", () => {
  it("rejects unauthenticated requests", async () => {
    auth.mockResolvedValue(null);
    const response = await GET(new Request("https://example.test/api/admin/subscribers"));
    expect(response.status).toBe(401);
  });

  it("returns subscriber aggregates to an admin", async () => {
    auth.mockResolvedValue({ user: { email: "admin@example.com" } });
    getSubscriberDashboard.mockResolvedValue({ total: 3, unsubscribed: 0, growth: [], contacts: [], pagination: { page: 1, pageSize: 10, total: 3, totalPages: 1 } });
    const response = await GET(new Request("https://example.test/api/admin/subscribers?page=2&query=ana"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ total: 3 });
    expect(getSubscriberDashboard).toHaveBeenCalledWith(2, "ana");
  });
});
