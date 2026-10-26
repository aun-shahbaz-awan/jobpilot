import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <h1 className="text-2xl font-bold">That job isn&apos;t here</h1>
      <p className="mt-2 text-ink-2">It may have been deleted or filtered out.</p>
      <Link href="/jobs" className="btn mt-6">
        Back to matches
      </Link>
    </div>
  );
}
