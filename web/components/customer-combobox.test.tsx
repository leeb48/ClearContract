import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerCombobox } from './customer-combobox';

// jsdom lacks the layout APIs base-ui's positioner relies on.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => {};

const customers = [
	{ id: 'c1', name: 'Alice Mason', email: 'alice@example.com', phone: '' },
	{ id: 'c2', name: 'Bob Reyes', email: '', phone: '555-0200' },
];

const getList = vi.fn();

vi.mock('@/lib/pb', () => ({
	pb: () => ({
		collection: () => ({ getList }),
		// mirror pb.filter just enough to recover the query in the mock below
		filter: (_expr: string, params: Record<string, string>) => `q:${params.q}`,
		authStore: { record: { id: 'user1' } },
	}),
}));

// vitest runs without globals, so RTL's automatic cleanup never registers.
afterEach(cleanup);

beforeEach(() => {
	getList.mockImplementation(async (_page: number, _perPage: number, opts: { filter?: string }) => {
		const q = opts.filter?.replace(/^q:/, '').toLowerCase() ?? '';
		return { items: q ? customers.filter((c) => c.name.toLowerCase().includes(q)) : customers };
	});
});

describe('CustomerCombobox', () => {
	it('searches server-side and reports the picked customer', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<CustomerCombobox value={null} onChange={onChange} />);

		await user.type(screen.getByPlaceholderText('Search customers…'), 'ali');

		// debounce (250ms) then the mocked fetch resolve; the initial unfiltered
		// fetch may render both names first, so wait for the narrowed result.
		const option = await screen.findByText('Alice Mason', undefined, { timeout: 2000 });
		await waitFor(() => expect(screen.queryByText('Bob Reyes')).toBeNull());

		await user.click(option);
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1', name: 'Alice Mason' }));
	});

	it('offers inline create prefilled with the query', async () => {
		const user = userEvent.setup();
		render(<CustomerCombobox value={null} onChange={vi.fn()} />);

		await user.type(screen.getByPlaceholderText('Search customers…'), 'Zed');
		const createButton = await screen.findByRole(
			'button',
			{ name: /Add “Zed” as new customer/ },
			{ timeout: 2000 },
		);

		await user.click(createButton);
		expect(await screen.findByRole('heading', { name: 'Add customer' })).toBeInTheDocument();
		expect(screen.getByLabelText('Name')).toHaveValue('Zed');
	});
});
