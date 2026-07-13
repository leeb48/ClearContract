import { expect, test, type Page } from '@playwright/test';

// Journey 2 (plan §7.3): add a customer, find them by search, edit, delete.

async function openNav(page: Page, label: string) {
	const hamburger = page.getByRole('button', { name: 'Open menu' });
	if (await hamburger.isVisible()) await hamburger.click();
	await page.getByRole('link', { name: label }).click();
}

test('add, search, edit, and delete a customer', async ({ page }, testInfo) => {
	const email = `e2e-cust-${Date.now()}-${testInfo.project.name}@example.com`;
	const password = 'e2e-password-123';

	// networkidle: ensure hydration finished before interacting — a click on the
	// pre-hydration HTML triggers a native form submit that reloads the page.
	await page.goto('/register', { waitUntil: 'networkidle' });
	await page.getByLabel('Your name').fill('James');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password', { exact: true }).fill(password);
	await page.getByLabel('Confirm password').fill(password);
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

	await openNav(page, 'Customers');
	await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();
	await expect(page.getByText('No customers yet — add your first one.')).toBeVisible();

	// add two customers through the dialog
	for (const [name, phone] of [
		['Alice Mason', '555-0100'],
		['Bob Reyes', '555-0200'],
	]) {
		await page.getByRole('button', { name: 'Add customer' }).click();
		await page.getByLabel('Name').fill(name);
		await page.getByLabel('Phone').fill(phone);
		await page.getByRole('button', { name: 'Add customer' }).last().click();
		await expect(page.getByText('Customer added')).toBeVisible();
		await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();
	}

	// search narrows the list
	await page.getByLabel('Search customers').fill('alice');
	await expect(page.getByRole('link', { name: /Alice Mason/ })).toBeVisible();
	await expect(page.getByRole('link', { name: /Bob Reyes/ })).toBeHidden();

	// profile: edit the name
	await page.getByRole('link', { name: /Alice Mason/ }).click();
	await expect(page.getByRole('heading', { name: 'Alice Mason' })).toBeVisible();
	await page.getByRole('button', { name: 'Edit' }).click();
	await page.getByLabel('Name').fill('Alice Mason-Wright');
	await page.getByRole('button', { name: 'Save customer' }).click();
	await expect(page.getByText('Customer updated')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Alice Mason-Wright' })).toBeVisible();

	// delete with confirm
	await page.getByRole('button', { name: 'Delete customer' }).click();
	await page.getByRole('button', { name: 'Yes, delete' }).click();
	await expect(page.getByText('Customer deleted')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();
	await expect(page.getByRole('link', { name: /Bob Reyes/ })).toBeVisible();
});
