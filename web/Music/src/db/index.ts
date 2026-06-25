import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import { optionalEnvValue } from "@/lib/env";

let client: Client | null = null;
let db: LibSQLDatabase<typeof schema> | null = null;

function getDatabaseUrl() {
  const url = optionalEnvValue("TURSO_DATABASE_URL");

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is required for database access.");
  }

  return url;
}

export function getTursoClient() {
  if (!client) {
    client = createClient({
      url: getDatabaseUrl(),
      authToken: optionalEnvValue("TURSO_AUTH_TOKEN"),
    });
  }

  return client;
}

export function getDb() {
  if (!db) {
    db = drizzle(getTursoClient(), { schema });
  }

  return db;
}

export type Db = ReturnType<typeof getDb>;
