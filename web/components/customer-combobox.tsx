'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { RecordModel } from 'pocketbase';
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxSeparator,
} from '@/components/ui/combobox';
import { CustomerFormDialog } from '@/components/customer-form-dialog';
import { pb } from '@/lib/pb';
import { useDebouncedValue } from '@/lib/use-debounced-value';

interface CustomerComboboxProps {
	value: RecordModel | null;
	onChange: (customer: RecordModel | null) => void;
	/** Forwarded to the input so a <Label htmlFor> can target it. */
	id?: string;
}

/**
 * Search-and-pick with inline create — built for the quote builder (Phase 3),
 * self-contained so it drops in anywhere a customer needs choosing.
 */
export function CustomerCombobox({ value, onChange, id }: CustomerComboboxProps) {
	const [inputValue, setInputValue] = useState('');
	const debouncedQuery = useDebouncedValue(inputValue);
	const [items, setItems] = useState<RecordModel[]>([]);
	const [open, setOpen] = useState(false);
	const [dialogOpen, setDialogOpen] = useState(false);
	// Captured when create is clicked — closing the popup resets inputValue,
	// which would wipe the prefill before the dialog mounts.
	const [createName, setCreateName] = useState('');

	// Server-side search: PB filters, the combobox's own filtering is disabled below.
	useEffect(() => {
		const q = debouncedQuery.trim();
		pb()
			.collection('customers')
			.getList(1, 20, {
				filter: q ? pb().filter('name ~ {:q} || email ~ {:q} || phone ~ {:q}', { q }) : '',
				sort: 'name',
			})
			.then((result) => setItems(result.items))
			.catch((err) => {
				if (err?.isAbort) return;
				setItems([]);
			});
	}, [debouncedQuery]);

	const trimmed = inputValue.trim();

	return (
		<>
			<Combobox
				items={items}
				value={value}
				onValueChange={(next: RecordModel | null) => onChange(next)}
				inputValue={inputValue}
				onInputValueChange={setInputValue}
				open={open}
				onOpenChange={setOpen}
				filter={null}
				itemToStringLabel={(c: RecordModel) => c?.name ?? ''}
				isItemEqualToValue={(a: RecordModel, b: RecordModel) => a?.id === b?.id}
			>
				<ComboboxInput id={id} placeholder="Search customers…" showClear className="w-full" />
				<ComboboxContent>
					<ComboboxEmpty>No customers found.</ComboboxEmpty>
					<ComboboxList>
						{(item: RecordModel) => (
							<ComboboxItem key={item.id} value={item}>
								<div className="min-w-0">
									<div className="truncate">{item.name}</div>
									{(item.email || item.phone) && (
										<div className="truncate text-xs text-muted-foreground">
											{[item.email, item.phone].filter(Boolean).join(' · ')}
										</div>
									)}
								</div>
							</ComboboxItem>
						)}
					</ComboboxList>
					{items.length > 0 && <ComboboxSeparator />}
					<div className="p-1">
						<button
							type="button"
							onClick={() => {
								setCreateName(trimmed);
								setOpen(false);
								setDialogOpen(true);
							}}
							className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
						>
							<Plus className="size-4" />
							{trimmed ? `Add “${trimmed}” as new customer` : 'Add new customer'}
						</button>
					</div>
				</ComboboxContent>
			</Combobox>
			<CustomerFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				initialName={createName}
				onSaved={(record) => {
					onChange(record);
					// inputValue is controlled here, so an external value change
					// doesn't sync the visible label on its own.
					setInputValue(record.name);
				}}
			/>
		</>
	);
}
