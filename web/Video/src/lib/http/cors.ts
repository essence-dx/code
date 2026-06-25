import { NextResponse } from "next/server";

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3100",
  "http://127.0.0.1:3100",
  "http://localhost:3101",
  "http://127.0.0.1:3101",
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
];

const defaultAllowedHeaders = ["content-type", "authorization", "x-requested-with"];

export function apiJson(request: Request, body: unknown, init?: ResponseInit, methods: string[] = ["GET", "POST", "OPTIONS"]) {
  return withCors(request, NextResponse.json(body, init), methods);
}

export function corsPreflight(request: Request, methods: string[] = ["GET", "POST", "OPTIONS"]) {
  const origin = allowedRequestOrigin(request);
  if (!origin) {
    return new Response(null, { status: request.headers.get("origin") ? 403 : 204, headers: { Vary: "Origin" } });
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin, methods),
  });
}

export function withCors<T extends Response>(request: Request, response: T, methods: string[] = ["GET", "POST", "OPTIONS"]) {
  const origin = allowedRequestOrigin(request);
  response.headers.append("Vary", "Origin");
  if (!origin) return response;

  for (const [key, value] of Object.entries(corsHeaders(origin, methods))) {
    response.headers.set(key, value);
  }

  return response;
}

export function readAllowedApiOrigins() {
  return uniqueOrigins([
    ...defaultAllowedOrigins,
    ...splitOrigins(process.env.ESSENCE_ALLOWED_API_ORIGINS),
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_ESSENCE_API_ORIGIN,
    withHttps(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    withHttps(process.env.VERCEL_URL),
  ]);
}

function allowedRequestOrigin(request: Request) {
  const origin = normalizeOrigin(request.headers.get("origin") ?? undefined);
  if (!origin) return null;
  return readAllowedApiOrigins().includes(origin) ? origin : null;
}

function corsHeaders(origin: string, methods: string[]) {
  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": defaultAllowedHeaders.join(", "),
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function splitOrigins(value?: string) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function uniqueOrigins(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map((value) => normalizeOrigin(value ?? undefined)).filter((value): value is string => Boolean(value))));
}

function normalizeOrigin(value?: string) {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      return new URL(trimmed).origin;
    } catch {
      return null;
    }
  }

  const customOrigin = trimmed.match(/^([a-z][a-z0-9+.-]*:\/\/[^/?#]+)/i)?.[1];
  return customOrigin ?? null;
}

function withHttps(value?: string) {
  if (!value) return undefined;
  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
}
