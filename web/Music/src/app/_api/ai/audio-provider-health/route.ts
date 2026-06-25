import { NextResponse } from "next/server";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET() {
  try {
    const config = getAiRuntimeConfig();

    if (!config.audioProviderHealthUrl) {
      return jsonError("AI_AUDIO_PROVIDER_HEALTH_URL is not configured.", 503);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(config.audioProviderHealthUrl, {
        signal: controller.signal,
      });

      return NextResponse.json({
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return normalizeRouteError(error);
  }
}
