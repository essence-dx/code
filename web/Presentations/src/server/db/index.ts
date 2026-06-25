import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"

import * as schema from "./schema"
import { getDatabaseAuthToken, getDatabaseUrl } from "@/server/env"

type Database = ReturnType<typeof drizzle<typeof schema>>

let db: Database | null = null

export function getDb() {
  if (!db) {
    db = drizzle(
      createClient({
        url: getDatabaseUrl(),
        authToken: getDatabaseAuthToken(),
      }),
      { schema },
    )
  }

  return db
}

export type AppDatabase = ReturnType<typeof getDb>
