import { z } from 'zod';

// PocketBase's own password minimum is 8 — mirror it so errors surface client-side.
const password = z.string().min(8, 'At least 8 characters').max(72);

export const loginSchema = z.object({
	email: z.email('Enter a valid email'),
	password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
	.object({
		name: z.string().trim().min(1, 'Name is required').max(100),
		email: z.email('Enter a valid email'),
		password,
		passwordConfirm: z.string(),
	})
	.refine((d) => d.password === d.passwordConfirm, {
		message: 'Passwords do not match',
		path: ['passwordConfirm'],
	});

export const profileSchema = z.object({
	name: z.string().trim().min(1, 'Name is required').max(100),
	phone: z.string().trim().max(30, 'Too long').optional().or(z.literal('')),
});

export const businessDetailsSchema = z.object({
	company_name: z.string().trim().max(120, 'Too long'),
	business_address: z.string().trim().max(500, 'Too long'),
});

export const changePasswordSchema = z
	.object({
		oldPassword: z.string().min(1, 'Current password is required'),
		password,
		passwordConfirm: z.string(),
	})
	.refine((d) => d.password === d.passwordConfirm, {
		message: 'Passwords do not match',
		path: ['passwordConfirm'],
	});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type BusinessDetailsInput = z.infer<typeof businessDetailsSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Logo upload constraints (plan §5.6) — checked client-side before upload;
// the collection schema enforces them server-side regardless.
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
export const LOGO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
