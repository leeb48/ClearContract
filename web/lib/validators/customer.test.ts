import { describe, expect, it } from 'vitest';
import { customerSchema } from './customer';

describe('customerSchema', () => {
	it('accepts a name-only customer', () => {
		const result = customerSchema.safeParse({ name: 'Dana Poole', email: '', phone: '', address: '', notes: '' });
		expect(result.success).toBe(true);
	});

	it('trims and requires name', () => {
		expect(customerSchema.safeParse({ name: '   ' }).success).toBe(false);
		const parsed = customerSchema.parse({ name: '  Dana Poole  ' });
		expect(parsed.name).toBe('Dana Poole');
	});

	it('rejects a malformed email but allows empty string', () => {
		expect(customerSchema.safeParse({ name: 'D', email: 'not-an-email' }).success).toBe(false);
		expect(customerSchema.safeParse({ name: 'D', email: '' }).success).toBe(true);
	});

	it('enforces collection max lengths', () => {
		expect(customerSchema.safeParse({ name: 'x'.repeat(121) }).success).toBe(false);
		expect(customerSchema.safeParse({ name: 'D', phone: 'x'.repeat(31) }).success).toBe(false);
		expect(customerSchema.safeParse({ name: 'D', address: 'x'.repeat(501) }).success).toBe(false);
		expect(customerSchema.safeParse({ name: 'D', notes: 'x'.repeat(2001) }).success).toBe(false);
	});
});
