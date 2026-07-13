'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { RecordModel } from 'pocketbase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { pb } from '@/lib/pb';
import { customerSchema, type CustomerInput } from '@/lib/validators/customer';

interface CustomerFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Existing record → edit; null/undefined → create. */
	customer?: RecordModel | null;
	/** Pre-fills the name field when creating (combobox inline-create). */
	initialName?: string;
	onSaved: (record: RecordModel) => void;
}

export function CustomerFormDialog({ open, onOpenChange, customer, initialName, onSaved }: CustomerFormDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				{/* Mounted fresh per open so useForm picks up the right defaults. */}
				{open && (
					<CustomerForm
						customer={customer}
						initialName={initialName}
						onSaved={(record) => {
							onSaved(record);
							onOpenChange(false);
						}}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function CustomerForm({
	customer,
	initialName,
	onSaved,
}: Pick<CustomerFormDialogProps, 'customer' | 'initialName' | 'onSaved'>) {
	const {
		register: field,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<CustomerInput>({
		resolver: zodResolver(customerSchema),
		defaultValues: {
			name: customer?.name ?? initialName ?? '',
			email: customer?.email ?? '',
			phone: customer?.phone ?? '',
			address: customer?.address ?? '',
			notes: customer?.notes ?? '',
		},
	});

	async function onSubmit(data: CustomerInput) {
		try {
			const record = customer
				? await pb().collection('customers').update(customer.id, data)
				: await pb()
						.collection('customers')
						.create({ ...data, user: pb().authStore.record!.id });
			toast.success(customer ? 'Customer updated' : 'Customer added');
			onSaved(record);
		} catch {
			toast.error(customer ? 'Could not update customer' : 'Could not add customer');
		}
	}

	return (
		<>
			<DialogHeader>
				<DialogTitle>{customer ? 'Edit customer' : 'Add customer'}</DialogTitle>
				<DialogDescription>Only the name is required — fill in the rest as you learn it.</DialogDescription>
			</DialogHeader>
			<form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
				<div className="grid gap-2">
					<Label htmlFor="customer-name">Name</Label>
					<Input id="customer-name" placeholder="Dana Poole" {...field('name')} />
					{errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
				</div>
				<div className="grid gap-2">
					<Label htmlFor="customer-email">Email</Label>
					<Input id="customer-email" type="email" {...field('email')} />
					{errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
				</div>
				<div className="grid gap-2">
					<Label htmlFor="customer-phone">Phone</Label>
					<Input id="customer-phone" type="tel" {...field('phone')} />
					{errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
				</div>
				<div className="grid gap-2">
					<Label htmlFor="customer-address">Address</Label>
					<Input id="customer-address" {...field('address')} />
					{errors.address && <p className="text-sm text-red-600">{errors.address.message}</p>}
				</div>
				<div className="grid gap-2">
					<Label htmlFor="customer-notes">Notes</Label>
					<Textarea id="customer-notes" rows={3} {...field('notes')} />
					{errors.notes && <p className="text-sm text-red-600">{errors.notes.message}</p>}
				</div>
				<div className="flex justify-end">
					<Button type="submit" disabled={isSubmitting}>
						{customer ? 'Save customer' : 'Add customer'}
					</Button>
				</div>
			</form>
		</>
	);
}
