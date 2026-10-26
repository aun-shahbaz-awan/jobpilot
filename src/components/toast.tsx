"use client";

import { createContext, useCallback, useContext, useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/app/actions";

type Toast = { id: number; text: string; kind: "ok" | "error" };
const ToastContext = createContext<(text: string, kind?: Toast["kind"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 8000 : 4000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto max-w-md rounded-xl border px-4 py-2.5 text-sm shadow-lg ${
              t.kind === "error" ? "border-danger bg-danger-soft text-danger" : "border-line bg-ink text-paper"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/** Runs a server action in a transition and reports its result as a toast. */
export function useAction() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const act = useCallback(
    <T,>(fn: () => Promise<ActionResult<T>>, opts: { success?: string; onDone?: (data?: T) => void } = {}) => {
      start(async () => {
        const r = await fn();
        if (!r.ok) toast(r.error, "error");
        else {
          const msg = opts.success ?? r.message;
          if (msg) toast(msg);
          opts.onDone?.(r.data);
        }
      });
    },
    [toast],
  );
  return { pending, act };
}
