import { getAuth } from "@/lib/auth/server";
import { corsPreflight, withCors } from "@/lib/http/cors";

export const runtime = "nodejs";

const methods = ["GET", "POST", "OPTIONS"];

export function OPTIONS(request: Request) {
  return corsPreflight(request, methods);
}

export async function GET(request: Request) {
  return withCors(request, await getAuth().handler(request), methods);
}

export async function POST(request: Request) {
  return withCors(request, await getAuth().handler(request), methods);
}
