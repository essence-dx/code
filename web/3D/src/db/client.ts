import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

type Database = LibSQLDatabase<typeof schema>;

let client: Client | null = null;
let db: Database | null = null;

function normalizeEnvValue(value: string) {
  return value.trim().replace(/^\uFEFF/, "").replace(/^\u200B/, "").replace(/^"(.*)"$/, "$1");
}

function requireEnv(name: "DATABASE_URL" | "DATABASE_AUTH_TOKEN") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for database access.`);
  }

  return normalizeEnvValue(value);
}

export function getDb() {
  if (!client) {
    client = createClient({
      url: requireEnv("DATABASE_URL"),
      authToken: requireEnv("DATABASE_AUTH_TOKEN"),
    });
  }

  if (!db) {
    db = drizzle(client, { schema });
  }

  return db;
}
