import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/lib/session";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function normalizeRouteError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return jsonError(error.message, 401);
  }

  if (error instanceof ZodError) {
    return jsonError("Invalid request body.", 422, error.flatten());
  }

  if (error instanceof Error) {
    return jsonError(error.message, 500);
  }

  return jsonError("Unknown server error.", 500);
}
