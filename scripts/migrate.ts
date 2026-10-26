import "dotenv/config";
import { mkdirSync } from "node:fs";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db, client } from "../src/lib/db";

const url = process.env.DATABASE_URL || "file:./data/jobpilot.db";
if (url.startsWith("file:")) mkdirSync("data", { recursive: true });

await client.execute("PRAGMA foreign_keys = ON");
await migrate(db, { migrationsFolder: "./drizzle" });
console.log(`Database ready (${url.startsWith("file:") ? url : "remote libSQL"})`);
