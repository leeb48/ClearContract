import { describe, expect, it } from "vitest";

const PB_URL = "http://127.0.0.1:8090";

describe("pocketbase test instance", () => {
  it("answers the health endpoint", async () => {
    const res = await fetch(`${PB_URL}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(200);
  });

  it("rejects unauthenticated superuser-only endpoints", async () => {
    const res = await fetch(`${PB_URL}/api/collections`);
    expect(res.status).toBeGreaterThanOrEqual(401);
  });
});
