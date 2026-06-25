import { drizzle } from "drizzle-orm/libsql";
import { schema } from "@/lib/db/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let db: Db | null = null;

function readDatabaseEnv() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is required before database access.");
  }

  return { url, authToken };
}

export function getDb() {
  if (!db) {
    const { url, authToken } = readDatabaseEnv();
    db = drizzle({
      connection: {
        url,
        authToken,
      },
      schema,
    });
  }

  return db;
}
