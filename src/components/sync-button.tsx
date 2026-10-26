"use client";

import { RefreshCw } from "lucide-react";
import { syncNow } from "@/app/actions";
import { useAction } from "./toast";

export function SyncButton({ lastSync, compact = false }: { lastSync: string | null; compact?: boolean }) {
  const { pending, act } = useAction();
  return (
    <div className={compact ? "" : "space-y-1"}>
      <button type="button" className="btn w-full" disabled={pending} onClick={() => act(() => syncNow(true))}>
        <RefreshCw size={15} className={pending ? "animate-spin" : ""} aria-hidden />
        {pending ? "Finding jobs…" : "Find new jobs"}
      </button>
      {!compact && <p className="px-1 text-xs text-ink-3">{lastSync ? `Last checked ${lastSync}` : "Not synced yet"}</p>}
    </div>
  );
}
