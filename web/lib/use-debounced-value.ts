'use client';

import { useEffect, useState } from 'react';

/** Returns `value` after it has been stable for `delayMs` — for search-as-you-type against PocketBase. */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);

	return debounced;
}
