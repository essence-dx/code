import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";

type AppDatabase = LibSQLDatabase<typeof schema>;

let cachedDb: AppDatabase | null = null;

export function getDb() {
  if (cachedDb) {
    return cachedDb;
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is required.");
  }

  if (url.startsWith("libsql://") && !authToken) {
    throw new Error("Database auth token is required for remote databases.");
  }

  cachedDb = drizzle(
    createClient({
      url,
      authToken,
    }),
    { schema },
  );

  return cachedDb;
}
