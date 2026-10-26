"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const dbMissing = /no such table|SQLITE_ERROR/i.test(error.message);
  return (
    <div className="mx-auto mt-16 max-w-lg">
      <h1 className="text-2xl font-bold">Something broke</h1>
      <p className="mt-2 text-ink-2">{dbMissing ? "The database isn't set up. Run pnpm run setup, then reload." : error.message}</p>
      <button className="btn mt-6" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
