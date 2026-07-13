import { describe, expect, it } from "vitest";
import { api, registerUser, superuserToken } from "./helpers";

describe("registration hook", () => {
  it("creates a business_settings row with defaults for a new user", async () => {
    const user = await registerUser();
    const su = await superuserToken();

    const res = await api(
      `/api/collections/business_settings/records?filter=${encodeURIComponent(`user="${user.id}"`)}`,
      {},
      su,
    );

    expect(res.status).toBe(200);
    const { items } = await res.json();
    expect(items).toHaveLength(1);
    expect(items[0].quote_prefix).toBe("TF");
    expect(items[0].next_quote_number).toBe(1);
    expect(items[0].next_invoice_number).toBe(1);
    expect(items[0].currency).toBe("USD");
    expect(items[0].collects_sales_tax).toBe(false);
    expect(items[0].greeting_enabled).toBe(true);
  });
});

describe("business_settings authorization rules", () => {
  it("owner can list and update their own settings", async () => {
    const user = await registerUser();
    const listRes = await api(
      "/api/collections/business_settings/records",
      {},
      user.token,
    );

    expect(listRes.status).toBe(200);
    const { items } = await listRes.json();
    expect(items).toHaveLength(1);

    const updateRes = await api(
      `/api/collections/business_settings/records/${items[0].id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ company_name: "James Driveways" }),
      },
      user.token,
    );

    expect(updateRes.status).toBe(200);
    expect((await updateRes.json()).company_name).toBe("James Driveways");
  });

  it("user A cannot list, view, or update user B's settings", async () => {
    const a = await registerUser("User A");
    const b = await registerUser("User B");
    const su = await superuserToken();

    const bRow = await api(
      `/api/collections/business_settings/records?filter=${encodeURIComponent(`user="${b.id}"`)}`,
      {},
      su,
    ).then((r) => r.json());
    const bId = bRow.items[0].id;

    // list as A only returns A's row
    const listAsA = await api(
      "/api/collections/business_settings/records",
      {},
      a.token,
    );
    const { items } = await listAsA.json();
    expect(items).toHaveLength(1);
    expect(items[0].user).toBe(a.id);

    // direct view of B's row → 404
    const viewRes = await api(
      `/api/collections/business_settings/records/${bId}`,
      {},
      a.token,
    );
    expect(viewRes.status).toBe(404);

    // update of B's row → 404
    const updateRes = await api(
      `/api/collections/business_settings/records/${bId}`,
      { method: "PATCH", body: JSON.stringify({ company_name: "hacked" }) },
      a.token,
    );
    expect(updateRes.status).toBe(404);
  });

  it("unauthenticated requests leak nothing and cannot write", async () => {
    // ensure at least one row exists before testing the guest view
    await registerUser();
    // PB treats an owner-scoped list rule as a filter for guests: 200 with zero rows
    const listRes = await api("/api/collections/business_settings/records");
    expect(listRes.status).toBe(200);
    expect((await listRes.json()).items).toHaveLength(0);

    const createRes = await api("/api/collections/business_settings/records", {
      method: "POST",
      body: JSON.stringify({ company_name: "nope" }),
    });
    expect(createRes.status).toBeGreaterThanOrEqual(400);
  });

  it("a user cannot create a settings row owned by someone else", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const res = await api(
      "/api/collections/business_settings/records",
      {
        method: "POST",
        body: JSON.stringify({ user: b.id, company_name: "spoof" }),
      },
      a.token,
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("users collection rules", () => {
  it("a user cannot view or update another user's record", async () => {
    const a = await registerUser();
    const b = await registerUser();

    const viewRes = await api(
      `/api/collections/users/records/${b.id}`,
      {},
      a.token,
    );
    expect(viewRes.status).toBe(404);

    const updateRes = await api(
      `/api/collections/users/records/${b.id}`,
      { method: "PATCH", body: JSON.stringify({ name: "hacked" }) },
      a.token,
    );
    expect(updateRes.status).toBe(404);
  });

  it("a user can update their own phone", async () => {
    const a = await registerUser();
    const res = await api(
      `/api/collections/users/records/${a.id}`,
      { method: "PATCH", body: JSON.stringify({ phone: "555-0123" }) },
      a.token,
    );
    expect(res.status).toBe(200);
    expect((await res.json()).phone).toBe("555-0123");
  });
});
