import type { Config } from "drizzle-kit"

export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  },
  strict: true,
  verbose: true,
} satisfies Config
