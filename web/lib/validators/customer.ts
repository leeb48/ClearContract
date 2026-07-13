import { z } from 'zod';

// Field limits mirror the customers collection schema (plan §3.5) so errors
// surface client-side instead of as opaque 400s.
export const customerSchema = z.object({
	name: z.string().trim().min(1, 'Name is required').max(120, 'Too long'),
	email: z.email('Enter a valid email').optional().or(z.literal('')),
	phone: z.string().trim().max(30, 'Too long').optional().or(z.literal('')),
	address: z.string().trim().max(500, 'Too long').optional().or(z.literal('')),
	notes: z.string().trim().max(2000, 'Too long').optional().or(z.literal('')),
});

export type CustomerInput = z.infer<typeof customerSchema>;
