// Shared helpers for integration tests hitting the booted PocketBase instance.
export const PB_URL = "http://127.0.0.1:8091";
const SUPERUSER = "test-superuser@example.com";
const SUPERUSER_PASS = "test-superuser-pass-123";

let counter = 0;

export async function api(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = token;
  return fetch(`${PB_URL}${path}`, { ...init, headers });
}

export async function superuserToken(): Promise<string> {
  const res = await api("/api/collections/_superusers/auth-with-password", {
    method: "POST",
    body: JSON.stringify({ identity: SUPERUSER, password: SUPERUSER_PASS }),
  });
  if (!res.ok) throw new Error(`superuser auth failed: ${res.status}`);
  return (await res.json()).token;
}

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

/** Registers a fresh user through the public API and authenticates as them. */
export async function registerUser(
  name = "Test Contractor",
): Promise<TestUser> {
  const email = `user-${Date.now()}-${counter++}@example.com`;
  const password = "test-password-123";

  const createRes = await api("/api/collections/users/records", {
    method: "POST",
    body: JSON.stringify({ email, password, passwordConfirm: password, name }),
  });

  if (!createRes.ok) throw new Error(`user create failed: ${createRes.status}`);

  const user = await createRes.json();

  const authRes = await api("/api/collections/users/auth-with-password", {
    method: "POST",
    body: JSON.stringify({ identity: email, password }),
  });

  if (!authRes.ok) throw new Error(`user auth failed: ${authRes.status}`);

  const { token } = await authRes.json();

  return { id: user.id, email, token };
}
