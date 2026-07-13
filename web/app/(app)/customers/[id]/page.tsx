'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { RecordModel } from 'pocketbase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerFormDialog } from '@/components/customer-form-dialog';
import { pb } from '@/lib/pb';

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params);
	const router = useRouter();
	const [customer, setCustomer] = useState<RecordModel | null>(null);
	const [notFound, setNotFound] = useState(false);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		pb()
			.collection('customers')
			.getOne(id)
			.then(setCustomer)
			.catch((err) => {
				if (err?.isAbort) return;
				setNotFound(true);
			});
	}, [id]);

	async function handleDelete() {
		setDeleting(true);
		try {
			await pb().collection('customers').delete(id);
			toast.success('Customer deleted');
			router.replace('/customers');
		} catch {
			toast.error('Could not delete customer');
			setDeleting(false);
		}
	}

	if (notFound) {
		return (
			<div className="mx-auto w-full max-w-3xl">
				<p className="py-8 text-center text-sm text-zinc-500">Customer not found.</p>
				<p className="text-center">
					<Link href="/customers" className="text-sm underline underline-offset-4">
						Back to customers
					</Link>
				</p>
			</div>
		);
	}

	if (!customer) {
		return <p className="py-8 text-center text-sm text-zinc-500">Loading…</p>;
	}

	const details: Array<[string, string]> = [
		['Email', customer.email],
		['Phone', customer.phone],
		['Address', customer.address],
	];

	return (
		<div className="mx-auto grid w-full max-w-3xl gap-6">
			<div>
				<Link
					href="/customers"
					className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
				>
					<ArrowLeft className="size-4" /> Customers
				</Link>
				<div className="mt-2 flex items-center justify-between gap-4">
					<h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
					<Button variant="outline" onClick={() => setDialogOpen(true)}>
						Edit
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Contact details</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3">
					{details.map(([label, value]) => (
						<div key={label} className="grid gap-0.5">
							<div className="text-xs text-zinc-500">{label}</div>
							<div className="text-sm">{value || '—'}</div>
						</div>
					))}
					<div className="grid gap-0.5">
						<div className="text-xs text-zinc-500">Notes</div>
						<div className="text-sm whitespace-pre-wrap">{customer.notes || '—'}</div>
					</div>
				</CardContent>
			</Card>

			{/* Quote history lands here in Phase 3. */}

			<Card className="border-red-200 dark:border-red-900">
				<CardHeader>
					<CardTitle>Danger zone</CardTitle>
					<CardDescription>Deleting a customer cannot be undone.</CardDescription>
				</CardHeader>
				<CardContent>
					{confirming ? (
						<div className="flex flex-wrap items-center gap-3">
							<span className="text-sm font-medium">Really delete {customer.name}?</span>
							<Button variant="destructive" onClick={handleDelete} disabled={deleting}>
								{deleting ? 'Deleting…' : 'Yes, delete'}
							</Button>
							<Button variant="outline" onClick={() => setConfirming(false)} disabled={deleting}>
								Cancel
							</Button>
						</div>
					) : (
						<Button variant="destructive" onClick={() => setConfirming(true)}>
							Delete customer
						</Button>
					)}
				</CardContent>
			</Card>

			<CustomerFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				customer={customer}
				onSaved={setCustomer}
			/>
		</div>
	);
}
