import "dotenv/config";
import { syncSources } from "../src/lib/sync";

const force = process.argv.includes("--force");
const results = await syncSources({ force, log: (m) => console.log(m) });
console.log("");
for (const r of results) {
  const detail = r.status === "ok" ? `${r.fetched} fetched, ${r.inserted} new, ${r.updated} updated` : r.message;
  console.log(`${r.status.padEnd(7)} ${r.source.padEnd(11)} ${detail ?? ""}`);
}
