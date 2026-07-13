import PocketBase from 'pocketbase';

export const PB_URL = process.env.NEXT_PUBLIC_PB_URL ?? 'http://127.0.0.1:8090';

// Singleton client for the browser; server components create their own
// per-request instances when auth context matters.
let client: PocketBase | undefined;

export function pb(): PocketBase {
	client ??= new PocketBase(PB_URL);
	return client;
}
