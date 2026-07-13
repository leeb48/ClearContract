'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, LayoutDashboard, LogOut, Menu, Receipt, Settings, Users, BookTemplate } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/auth';
import { pb } from '@/lib/pb';

const NAV = [
	{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
	{ href: '/quotes', label: 'Quotes', icon: FileText, disabled: true },
	{ href: '/invoices', label: 'Invoices', icon: Receipt, disabled: true },
	{ href: '/customers', label: 'Customers', icon: Users, disabled: true },
	{
		href: '/templates',
		label: 'Templates',
		icon: BookTemplate,
		disabled: true,
	},
	{ href: '/settings/account', label: 'Settings', icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
	const pathname = usePathname();
	return (
		<nav className="grid gap-1 px-3">
			{NAV.map((item) =>
				item.disabled ? (
					<span
						key={item.href}
						className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-500"
						title="Coming in a later phase"
					>
						<item.icon className="size-4" />
						{item.label}
					</span>
				) : (
					<Link
						key={item.href}
						href={item.href}
						onClick={onNavigate}
						className={cn(
							'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-800',
							pathname.startsWith(item.href.split('/').slice(0, 2).join('/')) &&
								'bg-slate-800 font-medium',
						)}
					>
						<item.icon className="size-4" />
						{item.label}
					</Link>
				),
			)}
		</nav>
	);
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const [sheetOpen, setSheetOpen] = useState(false);
	// Auth state lives in the PB auth store; server snapshot is "false" so the
	// prerendered HTML never contains the authenticated shell.
	const authed = useSyncExternalStore(
		(cb) => pb().authStore.onChange(cb),
		() => pb().authStore.isValid,
		() => false,
	);

	useEffect(() => {
		if (!authed) router.replace('/login');
	}, [authed, router]);

	function handleLogout() {
		logout(); // the store subscription flips `authed`, the effect redirects
	}

	if (!authed) return null;

	const sidebarInner = (
		<div className="flex h-full flex-col bg-slate-900 py-4 text-slate-100">
			<div className="mb-6 px-6 text-lg font-semibold tracking-tight">ClearContract</div>
			<NavLinks onNavigate={() => setSheetOpen(false)} />
			<div className="mt-auto px-3">
				<button
					onClick={handleLogout}
					className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
				>
					<LogOut className="size-4" />
					Log out
				</button>
			</div>
		</div>
	);

	return (
		<div className="flex min-h-screen w-full">
			<aside className="hidden w-60 shrink-0 lg:block">{sidebarInner}</aside>
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="flex items-center gap-3 border-b px-4 py-3 lg:hidden">
					<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
						<SheetTrigger
							aria-label="Open menu"
							className={buttonVariants({ variant: 'ghost', size: 'icon' })}
						>
							<Menu className="size-5" />
						</SheetTrigger>
						<SheetContent side="left" className="w-64 p-0">
							<SheetTitle className="sr-only">Navigation</SheetTitle>
							{sidebarInner}
						</SheetContent>
					</Sheet>
					<span className="font-semibold">ClearContract</span>
				</header>
				<main className="flex-1 bg-zinc-50 p-4 sm:p-6 dark:bg-zinc-950">{children}</main>
			</div>
		</div>
	);
}
