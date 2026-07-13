export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="mb-8 text-2xl font-semibold tracking-tight">
        ClearContract
      </div>
      {children}
    </div>
  );
}
