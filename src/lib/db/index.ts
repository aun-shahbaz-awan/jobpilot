import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

type DB = LibSQLDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __jobpilotDb?: DB; __jobpilotClient?: Client };

function makeClient(): Client {
  return createClient({
    url: process.env.DATABASE_URL || "file:./data/jobpilot.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
}

export const client: Client = globalForDb.__jobpilotClient ?? makeClient();
export const db: DB = globalForDb.__jobpilotDb ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__jobpilotClient = client;
  globalForDb.__jobpilotDb = db;
}

export { schema };
