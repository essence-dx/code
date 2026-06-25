import { defineConfig } from "drizzle-kit";
import { existsSync, readFileSync } from "node:fs";

for (const envFile of [".env.local", ".env"]) {
  if (!existsSync(envFile)) {
    continue;
  }

  const contents = readFileSync(envFile, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^\uFEFF/, "").trim();
    }
  }
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL?.replace(/^\uFEFF/, "").trim() ?? "",
    authToken: process.env.TURSO_AUTH_TOKEN?.replace(/^\uFEFF/, "").trim(),
  },
});
