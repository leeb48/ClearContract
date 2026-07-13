import { describe, expect, it } from 'vitest';
import { api, registerUser, superuserToken, type TestUser } from './helpers';

async function createCustomer(user: TestUser, fields: Record<string, unknown> = {}) {
	const res = await api(
		'/api/collections/customers/records',
		{
			method: 'POST',
			body: JSON.stringify({ user: user.id, name: 'Dana Poole', ...fields }),
		},
		user.token,
	);
	if (!res.ok) throw new Error(`customer create failed: ${res.status}`);
	return res.json();
}

describe('customers CRUD as owner', () => {
	it('creates, lists, updates, and deletes own customers', async () => {
		const user = await registerUser();
		const customer = await createCustomer(user, { email: 'dana@example.com', phone: '555-0100' });
		expect(customer.name).toBe('Dana Poole');

		const listRes = await api('/api/collections/customers/records', {}, user.token);
		expect(listRes.status).toBe(200);
		expect((await listRes.json()).items).toHaveLength(1);

		const updateRes = await api(
			`/api/collections/customers/records/${customer.id}`,
			{ method: 'PATCH', body: JSON.stringify({ phone: '555-0199' }) },
			user.token,
		);
		expect(updateRes.status).toBe(200);
		expect((await updateRes.json()).phone).toBe('555-0199');

		const deleteRes = await api(
			`/api/collections/customers/records/${customer.id}`,
			{ method: 'DELETE' },
			user.token,
		);
		expect(deleteRes.status).toBe(204);
	});

	it('rejects a customer without a name', async () => {
		const user = await registerUser();
		const res = await api(
			'/api/collections/customers/records',
			{ method: 'POST', body: JSON.stringify({ user: user.id, name: '' }) },
			user.token,
		);
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	it('filters by name/email/phone the way the search box does', async () => {
		const user = await registerUser();
		await createCustomer(user, { name: 'Alice Mason', email: 'alice@example.com' });
		await createCustomer(user, { name: 'Bob Reyes', phone: '555-7777' });

		const q = encodeURIComponent(`name ~ "alice" || email ~ "alice" || phone ~ "alice"`);
		const res = await api(`/api/collections/customers/records?filter=${q}`, {}, user.token);
		const { items } = await res.json();
		expect(items).toHaveLength(1);
		expect(items[0].name).toBe('Alice Mason');
	});
});

describe('customers authorization rules', () => {
	it("user A cannot list, view, update, or delete user B's customers", async () => {
		const a = await registerUser('User A');
		const b = await registerUser('User B');
		const bCustomer = await createCustomer(b);

		const listAsA = await api('/api/collections/customers/records', {}, a.token);
		expect((await listAsA.json()).items).toHaveLength(0);

		const viewRes = await api(`/api/collections/customers/records/${bCustomer.id}`, {}, a.token);
		expect(viewRes.status).toBe(404);

		const updateRes = await api(
			`/api/collections/customers/records/${bCustomer.id}`,
			{ method: 'PATCH', body: JSON.stringify({ name: 'hacked' }) },
			a.token,
		);
		expect(updateRes.status).toBe(404);

		const deleteRes = await api(
			`/api/collections/customers/records/${bCustomer.id}`,
			{ method: 'DELETE' },
			a.token,
		);
		expect(deleteRes.status).toBe(404);
	});

	it('a user cannot create a customer owned by someone else', async () => {
		const a = await registerUser();
		const b = await registerUser();
		const res = await api(
			'/api/collections/customers/records',
			{ method: 'POST', body: JSON.stringify({ user: b.id, name: 'spoof' }) },
			a.token,
		);
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	it('unauthenticated requests see nothing and cannot write', async () => {
		const user = await registerUser();
		await createCustomer(user);

		const listRes = await api('/api/collections/customers/records');
		expect(listRes.status).toBe(200);
		expect((await listRes.json()).items).toHaveLength(0);

		const createRes = await api('/api/collections/customers/records', {
			method: 'POST',
			body: JSON.stringify({ name: 'nope' }),
		});
		expect(createRes.status).toBeGreaterThanOrEqual(400);
	});

	it('deleting a user cascades to their customers', async () => {
		const user = await registerUser();
		const customer = await createCustomer(user);
		const su = await superuserToken();

		const delRes = await api(`/api/collections/users/records/${user.id}`, { method: 'DELETE' }, user.token);
		expect(delRes.status).toBe(204);

		const orphanRes = await api(`/api/collections/customers/records/${customer.id}`, {}, su);
		expect(orphanRes.status).toBe(404);
	});
});
