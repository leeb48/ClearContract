'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isAuthenticated, register as registerUser } from '@/lib/auth';
import { registerSchema, type RegisterInput } from '@/lib/validators/settings';

export default function RegisterPage() {
	const router = useRouter();
	const {
		register: field,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

	useEffect(() => {
		if (isAuthenticated()) router.replace('/dashboard');
	}, [router]);

	async function onSubmit(data: RegisterInput) {
		try {
			await registerUser(data);
			router.replace('/dashboard');
		} catch {
			toast.error('Registration failed — that email may already be in use');
		}
	}

	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle>Create your account</CardTitle>
				<CardDescription>Quotes and invoices, minus the chasing</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
					<div className="grid gap-2">
						<Label htmlFor="name">Your name</Label>
						<Input id="name" autoComplete="name" {...field('name')} />
						{errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" type="email" autoComplete="email" {...field('email')} />
						{errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="password">Password</Label>
						<Input id="password" type="password" autoComplete="new-password" {...field('password')} />
						{errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="passwordConfirm">Confirm password</Label>
						<Input
							id="passwordConfirm"
							type="password"
							autoComplete="new-password"
							{...field('passwordConfirm')}
						/>
						{errors.passwordConfirm && (
							<p className="text-sm text-red-600">{errors.passwordConfirm.message}</p>
						)}
					</div>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Creating…' : 'Create account'}
					</Button>
					<p className="text-center text-sm text-zinc-500">
						Already registered?{' '}
						<Link href="/login" className="underline">
							Log in
						</Link>
					</p>
				</form>
			</CardContent>
		</Card>
	);
}
