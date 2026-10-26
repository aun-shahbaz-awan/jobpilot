"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Briefcase, Columns3, Inbox, Settings, Sparkles, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Today", icon: BarChart3 },
  { href: "/jobs", label: "Matches", icon: Briefcase },
  { href: "/queue", label: "Review", icon: Inbox, badge: "queue" as const },
  { href: "/pipeline", label: "Pipeline", icon: Columns3 },
  { href: "/skills", label: "Skills", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

function active(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function SideNav({ queueCount }: { queueCount: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {ITEMS.map(({ href, label, icon: Icon, badge }) => {
        const on = active(path, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${on ? "bg-cobalt-soft text-cobalt" : "text-ink-2 hover:bg-sunken hover:text-ink"}`}
          >
            <Icon size={17} strokeWidth={2} aria-hidden />
            <span className="flex-1">{label}</span>
            {badge === "queue" && queueCount > 0 && <span className="rounded-full bg-cobalt px-1.5 text-xs font-semibold text-cobalt-ink tabular-nums">{queueCount}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav({ queueCount }: { queueCount: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface md:hidden">
      {ITEMS.slice(0, 5).map(({ href, label, icon: Icon, badge }) => {
        const on = active(path, href);
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined} className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${on ? "text-cobalt" : "text-ink-3"}`}>
            <Icon size={19} aria-hidden />
            {label}
            {badge === "queue" && queueCount > 0 && <span className="absolute right-[22%] top-1 rounded-full bg-cobalt px-1 text-[10px] font-semibold text-cobalt-ink">{queueCount}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
