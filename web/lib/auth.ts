import { pb } from "@/lib/pb";
import type { RegisterInput } from "@/lib/validators/settings";

export async function register(data: RegisterInput): Promise<void> {
  await pb().collection("users").create({
    name: data.name,
    email: data.email,
    password: data.password,
    passwordConfirm: data.passwordConfirm,
  });
  await pb().collection("users").authWithPassword(data.email, data.password);
}

export async function login(email: string, password: string): Promise<void> {
  await pb().collection("users").authWithPassword(email, password);
}

export function logout(): void {
  pb().authStore.clear();
}

export function isAuthenticated(): boolean {
  return pb().authStore.isValid;
}
