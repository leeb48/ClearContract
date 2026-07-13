import { describe, expect, it } from "vitest";
import {
  businessDetailsSchema,
  changePasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
} from "./settings";

describe("registerSchema", () => {
  const valid = {
    name: "James",
    email: "james@example.com",
    password: "long-enough-pass",
    passwordConfirm: "long-enough-pass",
  };

  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects mismatched password confirmation", () => {
    const r = registerSchema.safeParse({
      ...valid,
      passwordConfirm: "different-pass",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["passwordConfirm"]);
  });

  it("rejects short passwords and bad emails and empty names", () => {
    expect(
      registerSchema.safeParse({
        ...valid,
        password: "short",
        passwordConfirm: "short",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false);
    expect(registerSchema.safeParse({ ...valid, name: "  " }).success).toBe(
      false,
    );
  });
});

describe("loginSchema", () => {
  it("requires an email and any password", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "x" }).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({ email: "nope", password: "x" }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "" }).success,
    ).toBe(false);
  });
});

describe("profileSchema", () => {
  it("allows empty phone but not empty name", () => {
    expect(profileSchema.safeParse({ name: "James", phone: "" }).success).toBe(
      true,
    );
    expect(profileSchema.safeParse({ name: "", phone: "555" }).success).toBe(
      false,
    );
  });
});

describe("businessDetailsSchema", () => {
  it("accepts empty fields (nothing is required to start)", () => {
    expect(
      businessDetailsSchema.safeParse({
        company_name: "",
        business_address: "",
      }).success,
    ).toBe(true);
  });
  it("rejects over-long values", () => {
    expect(
      businessDetailsSchema.safeParse({
        company_name: "x".repeat(121),
        business_address: "",
      }).success,
    ).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("requires matching new passwords and the old password", () => {
    expect(
      changePasswordSchema.safeParse({
        oldPassword: "old-pass-123",
        password: "new-pass-456",
        passwordConfirm: "new-pass-456",
      }).success,
    ).toBe(true);
    expect(
      changePasswordSchema.safeParse({
        oldPassword: "",
        password: "new-pass-456",
        passwordConfirm: "new-pass-456",
      }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        oldPassword: "old-pass-123",
        password: "new-pass-456",
        passwordConfirm: "other",
      }).success,
    ).toBe(false);
  });
});
