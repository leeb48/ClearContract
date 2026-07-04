export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex max-w-xl flex-col items-center gap-6 text-center">
        <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:text-zinc-400">
          Coming soon
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          ClearContract
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Professional quotes and invoices for independent contractors. Send a quote by
          email, let your customer accept and pay a deposit online, and stop chasing.
        </p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          In development — contact{" "}
          <a href="mailto:quotes@clearcontract.appassembly.net" className="underline">
            quotes@clearcontract.appassembly.net
          </a>
        </p>
      </main>
    </div>
  );
}
