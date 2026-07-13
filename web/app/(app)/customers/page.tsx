'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { RecordModel } from 'pocketbase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CustomerFormDialog } from '@/components/customer-form-dialog';
import { pb } from '@/lib/pb';
import { useDebouncedValue } from '@/lib/use-debounced-value';

export default function CustomersPage() {
	const [query, setQuery] = useState('');
	const debouncedQuery = useDebouncedValue(query);
	const [customers, setCustomers] = useState<RecordModel[] | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);

	useEffect(() => {
		const q = debouncedQuery.trim();
		pb()
			.collection('customers')
			.getFullList({
				filter: q ? pb().filter('name ~ {:q} || email ~ {:q} || phone ~ {:q}', { q }) : '',
				sort: 'name',
			})
			.then(setCustomers)
			.catch((err) => {
				if (err?.isAbort) return;
				toast.error('Could not load customers');
			});
	}, [debouncedQuery, refreshKey]);

	return (
		<div className="mx-auto w-full max-w-3xl">
			<div className="flex items-center justify-between gap-4">
				<h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
				<Button onClick={() => setDialogOpen(true)}>
					<Plus /> Add customer
				</Button>
			</div>
			<div className="relative mt-4">
				<Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
				<Input
					type="search"
					aria-label="Search customers"
					placeholder="Search by name, email, or phone"
					className="pl-8"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
				/>
			</div>
			<div className="mt-4">
				{customers === null ? (
					<p className="py-8 text-center text-sm text-zinc-500">Loading…</p>
				) : customers.length === 0 ? (
					<p className="py-8 text-center text-sm text-zinc-500">
						{debouncedQuery.trim()
							? 'No customers match your search.'
							: 'No customers yet — add your first one.'}
					</p>
				) : (
					<Card className="py-0">
						<CardContent className="divide-y px-0">
							{customers.map((c) => (
								<Link
									key={c.id}
									href={`/customers/${c.id}`}
									className="block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
								>
									<div className="font-medium">{c.name}</div>
									{(c.email || c.phone) && (
										<div className="text-sm text-zinc-500">
											{[c.email, c.phone].filter(Boolean).join(' · ')}
										</div>
									)}
								</Link>
							))}
						</CardContent>
					</Card>
				)}
			</div>
			<CustomerFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSaved={() => setRefreshKey((k) => k + 1)}
			/>
		</div>
	);
}
