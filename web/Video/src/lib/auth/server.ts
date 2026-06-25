import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { headers } from "next/headers";
import { getDb } from "@/lib/db/client";
import { schema } from "@/lib/db/schema";
import { readAllowedApiOrigins } from "@/lib/http/cors";

function createAuth() {
  const baseURL = readAuthBaseUrl();

  return betterAuth({
    appName: "Essence Studio",
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    trustedOrigins: () => readTrustedOrigins(baseURL),
    advanced: {
      defaultCookieAttributes: crossSiteCookieAttributes(baseURL),
      database: {
        generateId: () => crypto.randomUUID(),
      },
    },
  });
}

function readAuthBaseUrl() {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    withHttps(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    withHttps(process.env.VERCEL_URL) ??
    "http://localhost:3000"
  );
}

function readTrustedOrigins(baseURL: string) {
  return Array.from(
    new Set(
      [
        baseURL,
        ...readAllowedApiOrigins(),
        process.env.BETTER_AUTH_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        withHttps(process.env.VERCEL_PROJECT_PRODUCTION_URL),
        withHttps(process.env.VERCEL_URL),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3100",
        "http://127.0.0.1:3100",
        "http://localhost:3101",
        "http://127.0.0.1:3101",
      ].filter((origin): origin is string => Boolean(origin)),
    ),
  );
}

function crossSiteCookieAttributes(baseURL: string) {
  return baseURL.startsWith("https://") ? { sameSite: "none" as const, secure: true } : undefined;
}

function withHttps(value?: string) {
  if (!value) return undefined;
  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
}

type AuthInstance = ReturnType<typeof createAuth>;

let authInstance: AuthInstance | undefined;

export function getAuth(): AuthInstance {
  authInstance ??= createAuth();
  return authInstance;
}

export async function getServerSession() {
  return getAuth().api.getSession({
    headers: await headers(),
  });
}
