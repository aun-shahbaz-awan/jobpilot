import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import "./globals.css";
import { db } from "@/lib/db";
import { applications, syncRuns } from "@/lib/db/schema";
import { timeAgo } from "@/lib/format";
import { BottomNav, SideNav } from "@/components/nav";
import { SyncButton } from "@/components/sync-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: "JobPilot",
  description: "Your job search, matched, drafted and tracked.",
  icons: { icon: "/icon.svg" },
};

const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

async function shellData() {
  await connection();
  const drafts = await db.$count(applications, eq(applications.status, "draft"));
  const [last] = await db
    .select({ at: syncRuns.finishedAt })
    .from(syncRuns)
    .where(and(isNull(syncRuns.error)))
    .orderBy(desc(syncRuns.finishedAt))
    .limit(1);
  return { drafts, lastSync: last?.at ? timeAgo(last.at) : null };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { drafts, lastSync } = await shellData();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ToastProvider>
          <div className="mx-auto flex min-h-screen max-w-[1440px]">
            <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-line px-4 py-5 md:flex">
              <div className="flex items-center justify-between px-2">
                <Link href="/" className="font-display text-xl font-bold tracking-tight">
                  JobPilot
                </Link>
                <ThemeToggle />
              </div>
              <SideNav queueCount={drafts} />
              <div className="mt-auto">
                <SyncButton lastSync={lastSync} />
              </div>
            </aside>
            <div className="min-w-0 flex-1">
              <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
                <Link href="/" className="font-display text-lg font-bold">
                  JobPilot
                </Link>
                <div className="flex items-center gap-1">
                  <SyncButton lastSync={lastSync} compact />
                  <ThemeToggle />
                </div>
              </header>
              <main className="px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8">{children}</main>
            </div>
          </div>
          <BottomNav queueCount={drafts} />
        </ToastProvider>
      </body>
    </html>
  );
}
