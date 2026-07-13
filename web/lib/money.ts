// All money values are integer cents. Formatting happens only at display edges.
// This module is pure and shared conceptually with pb_hooks — the hook-side result
// is always authoritative (plan §5.1).

export type ItemType = 'fixed' | 'hourly';
export type AmountType = 'fixed' | 'percent';

// Shape matches the line_items/extras JSON stored on quote records (plan §3.6).
export interface LineItem {
	id: string;
	description: string;
	type: ItemType;
	qty?: number;
	unit_price?: number; // cents
	hours?: number;
	rate?: number; // cents per hour
	show_breakdown?: boolean;
}

export interface QuoteMoneyInput {
	line_items: LineItem[];
	extras?: LineItem[];
	tax_enabled?: boolean;
	tax_rate?: number; // percent, decimals allowed (e.g. 8.25)
	deposit_enabled?: boolean;
	deposit_type?: AmountType;
	deposit_value?: number; // cents if fixed; percent if percent
	cash_enabled?: boolean;
	cash_discount_type?: AmountType;
	cash_discount_value?: number; // cents if fixed; percent if percent
}

export interface QuoteTotals {
	subtotal: number;
	taxAmount: number;
	total: number;
	depositAmount: number;
	remaining: number;
	/** Present when cash_enabled with a positive discount; the "pay cash" variant. */
	cash: CashTotals | null;
}

export interface CashTotals {
	discountAmount: number; // off the pre-tax subtotal (plan §5.1)
	subtotal: number;
	taxAmount: number;
	total: number;
	depositAmount: number;
	remaining: number;
}

export function lineTotal(item: LineItem): number {
	const raw =
		item.type === 'hourly' ? (item.hours ?? 0) * (item.rate ?? 0) : (item.qty ?? 0) * (item.unit_price ?? 0);
	return Math.round(raw);
}

function taxOn(subtotal: number, enabled: boolean | undefined, rate: number | undefined): number {
	if (!enabled || !rate || rate <= 0) return 0;
	return Math.round((subtotal * rate) / 100);
}

function depositOn(
	total: number,
	enabled: boolean | undefined,
	type: AmountType | undefined,
	value: number | undefined,
): number {
	if (!enabled || !value || value <= 0) return 0;
	if (type === 'percent') return Math.min(Math.round((total * value) / 100), total);
	return Math.min(Math.round(value), total); // fixed deposits are capped at the total
}

export function cashDiscountAmount(subtotal: number, type: AmountType | undefined, value: number | undefined): number {
	if (!value || value <= 0) return 0;
	if (type === 'percent') return Math.min(Math.round((subtotal * value) / 100), subtotal);
	return Math.min(Math.round(value), subtotal);
}

export function computeQuoteTotals(q: QuoteMoneyInput): QuoteTotals {
	const items = [...q.line_items, ...(q.extras ?? [])];
	const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
	const taxAmount = taxOn(subtotal, q.tax_enabled, q.tax_rate);
	const total = subtotal + taxAmount;
	const depositAmount = depositOn(total, q.deposit_enabled, q.deposit_type, q.deposit_value);

	let cash: CashTotals | null = null;
	const discountAmount = q.cash_enabled
		? cashDiscountAmount(subtotal, q.cash_discount_type, q.cash_discount_value)
		: 0;
	if (discountAmount > 0) {
		// Discount applies to the pre-tax subtotal; tax is due on what's actually charged.
		const cashSubtotal = subtotal - discountAmount;
		const cashTax = taxOn(cashSubtotal, q.tax_enabled, q.tax_rate);
		const cashTotal = cashSubtotal + cashTax;
		// Percent deposits recompute against the discounted total; fixed deposits stay
		// as-is but are capped at the discounted total (plan §5.1).
		const cashDeposit = depositOn(cashTotal, q.deposit_enabled, q.deposit_type, q.deposit_value);
		cash = {
			discountAmount,
			subtotal: cashSubtotal,
			taxAmount: cashTax,
			total: cashTotal,
			depositAmount: cashDeposit,
			remaining: cashTotal - cashDeposit,
		};
	}

	return {
		subtotal,
		taxAmount,
		total,
		depositAmount,
		remaining: total - depositAmount,
		cash,
	};
}

/** Stripe fee pass-through surcharge: 2.9% + 30¢, rounded up (plan §5.1). */
export function feeSurcharge(amount: number): number {
	if (amount <= 0) return 0;
	return Math.ceil(amount * 0.029) + 30;
}

export function formatCents(cents: number, currency = 'USD'): string {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}
