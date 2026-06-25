import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "@/db/schema";

let client: Client | null = null;
let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

function readEnv(name: "TURSO_DATABASE_URL" | "TURSO_AUTH_TOKEN") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to use the database`);
  }

  return value;
}

export function getTursoClient() {
  if (!client) {
    client = createClient({
      url: readEnv("TURSO_DATABASE_URL"),
      authToken: readEnv("TURSO_AUTH_TOKEN"),
    });
  }

  return client;
}

export function getDb() {
  if (!database) {
    database = drizzle(getTursoClient(), { schema });
  }

  return database;
}
