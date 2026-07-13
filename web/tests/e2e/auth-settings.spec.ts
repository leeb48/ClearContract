import { expect, test, type Page } from "@playwright/test";

// Journey 1 (plan §7.3): register → onboard business settings → logout → login.
// Runs on both the desktop and mobile projects; nav goes through the hamburger
// drawer when the sidebar is collapsed.

async function openNav(page: Page, label: string) {
  const hamburger = page.getByRole("button", { name: "Open menu" });
  if (await hamburger.isVisible()) await hamburger.click();
  await page.getByRole("link", { name: label }).click();
}

test("register, set business details, log out, log back in", async ({
  page,
}, testInfo) => {
  const email = `e2e-${Date.now()}-${testInfo.project.name}@example.com`;
  const password = "e2e-password-123";

  // networkidle: ensure hydration finished before interacting — a click on the
  // pre-hydration HTML triggers a native form submit that reloads the page.
  await page.goto("/register", { waitUntil: "networkidle" });
  await page.getByLabel("Your name").fill("James");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await openNav(page, "Settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.getByLabel("Company name").fill("James Driveways");
  await page.getByLabel("Business address").fill("123 Main St, Phoenix, AZ");
  await page.getByRole("button", { name: "Save business details" }).click();
  await expect(page.getByText("Business details saved")).toBeVisible();

  // log out via the nav
  const hamburger = page.getByRole("button", { name: "Open menu" });
  if (await hamburger.isVisible()) await hamburger.click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);

  // log back in and confirm the settings persisted
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await openNav(page, "Settings");
  await expect(page.getByLabel("Company name")).toHaveValue("James Driveways");
});
