import { NextResponse, type NextRequest } from "next/server";
import { syncNextDue, syncSources } from "@/lib/sync";

export const maxDuration = 60;

/**
 * Called by a scheduler (Netlify scheduled function, cron, etc.).
 * Requires `Authorization: Bearer $CRON_SECRET`. Add `?all=1` to sync every source at once.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const all = req.nextUrl.searchParams.get("all") === "1";
  const results = all ? await syncSources() : await syncNextDue();
  return NextResponse.json({ results });
}
