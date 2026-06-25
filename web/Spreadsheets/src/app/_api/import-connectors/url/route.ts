import { lookup } from "node:dns/promises";
import { NextResponse } from "next/server";
import {
  maxConnectorTextLength,
  parseImportConnectorText,
  type ImportConnectorFormat,
} from "@/features/workbooks/import-connectors";
import { normalizeImportConnectorTransformSteps } from "@/features/workbooks/import-connector-transforms";
import { getCurrentSession } from "@/lib/session";

export const runtime = "nodejs";

const maxRedirects = 3;

const connectorErrorMessages: Record<string, string> = {
  "bad-redirect": "Connector redirected to an unsupported or private URL.",
  "fetch-failed": "Connector fetch failed or returned a non-success status.",
  "private-host": "Connector URL resolved to a private network address.",
  "too-large": "Connector response is too large.",
  "too-many-redirects": "Connector followed too many redirects.",
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map((part) => Number(part));
  const [first, second] = parts;

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();

  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

function isLocalHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    isPrivateIpv4(normalized) ||
    (normalized.includes(":") && isPrivateIpv6(normalized))
  );
}

function normalizeConnectorUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    if (url.username || url.password || isLocalHostname(url.hostname)) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

async function assertPublicHostname(url: URL) {
  const addresses = await lookup(url.hostname, { all: true, verbatim: false });

  if (
    addresses.length === 0 ||
    addresses.some((item) =>
      item.family === 6 ? isPrivateIpv6(item.address) : isPrivateIpv4(item.address),
    )
  ) {
    throw new Error("private-host");
  }
}

async function fetchConnectorText(initialUrl: URL) {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    await assertPublicHostname(currentUrl);

    const response = await fetch(currentUrl, {
      headers: {
        accept:
          "text/csv,text/tab-separated-values,application/json,text/html,text/plain;q=0.8",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      const nextUrl = normalizeConnectorUrl(
        location ? new URL(location, currentUrl).toString() : "",
      );

      if (!nextUrl) {
        throw new Error("bad-redirect");
      }

      currentUrl = nextUrl;
      continue;
    }

    if (!response.ok) {
      throw new Error("fetch-failed");
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);

    if (contentLength > maxConnectorTextLength) {
      throw new Error("too-large");
    }

    const text = await response.text();

    if (text.length > maxConnectorTextLength) {
      throw new Error("too-large");
    }

    return {
      contentType: response.headers.get("content-type") ?? undefined,
      text,
      url: currentUrl.toString(),
    };
  }

  throw new Error("too-many-redirects");
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return errorResponse("Authentication required.", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  const payload =
    typeof body === "object" && body !== null
      ? (body as {
          format?: unknown;
          name?: unknown;
          transformSteps?: unknown;
          url?: unknown;
        })
      : {};
  const url = normalizeConnectorUrl(payload.url);

  if (!url) {
    return errorResponse("Enter a public HTTP or HTTPS URL.", 400);
  }

  try {
    const response = await fetchConnectorText(url);
    const result = parseImportConnectorText({
      contentType: response.contentType,
      format:
        typeof payload.format === "string"
          ? (payload.format as ImportConnectorFormat)
          : "auto",
      name:
        typeof payload.name === "string" && payload.name.trim()
          ? payload.name
          : url.hostname,
      sourceType: "url",
      text: response.text,
      transformSteps: normalizeImportConnectorTransformSteps(
        payload.transformSteps,
      ),
      url: response.url,
    });

    if (!result.ok) {
      return errorResponse(result.error, 422);
    }

    return NextResponse.json({
      ok: true,
      format: result.format,
      sheet: result.sheet,
      sourceName: result.sourceName,
      sourceType: result.sourceType,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? (connectorErrorMessages[error.message] ??
          "Could not fetch an importable public data source.")
        : "Could not fetch an importable public data source.";

    return errorResponse(message, 422);
  }
}
