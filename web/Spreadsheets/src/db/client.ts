import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import { requireServerEnv } from "@/lib/env";

function createDatabase() {
  const client = createClient({
    url: requireServerEnv("TURSO_CONNECTION_URL"),
    authToken: requireServerEnv("TURSO_AUTH_TOKEN"),
  });

  return drizzle(client, { schema });
}

let database: ReturnType<typeof createDatabase> | null = null;

export function getDb() {
  database ??= createDatabase();
  return database;
}
