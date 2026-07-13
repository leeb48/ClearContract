"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Only Account exists in Phase 1; the rest land with their phases (5/9/8).
const TABS = [
  { href: "/settings/account", label: "Account" },
  { href: "/settings/billing", label: "Billing", disabled: true },
  { href: "/settings/quoting", label: "Quoting", disabled: true },
  { href: "/settings/notifications", label: "Notifications", disabled: true },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <div className="mt-4 flex gap-1 overflow-x-auto border-b">
        {TABS.map((tab) =>
          tab.disabled ? (
            <span
              key={tab.href}
              className="whitespace-nowrap px-3 py-2 text-sm text-zinc-400"
              title="Coming in a later phase"
            >
              {tab.label}
            </span>
          ) : (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm hover:text-zinc-950 dark:hover:text-zinc-50",
                pathname === tab.href
                  ? "border-zinc-950 font-medium text-zinc-950 dark:border-zinc-50 dark:text-zinc-50"
                  : "text-zinc-500",
              )}
            >
              {tab.label}
            </Link>
          ),
        )}
      </div>
      <div className="py-6">{children}</div>
    </div>
  );
}
