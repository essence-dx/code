import { readDesktopUpdatePlatformValue } from "@/lib/desktop-update-env";

export const dynamic = "force-dynamic";

function parseVersion(value: string) {
  return value
    .replace(/^v/i, "")
    .split(/[.+-]/)
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

function isNewerVersion(candidate: string, current: string) {
  const next = parseVersion(candidate);
  const active = parseVersion(current);

  for (let index = 0; index < 3; index += 1) {
    if ((next[index] ?? 0) > (active[index] ?? 0)) {
      return true;
    }

    if ((next[index] ?? 0) < (active[index] ?? 0)) {
      return false;
    }
  }

  return false;
}

export async function GET(_request: Request, context: { params: Promise<{ arch: string; currentVersion: string; target: string }> }) {
  const { arch, currentVersion, target } = await context.params;
  const version = process.env.DESKTOP_UPDATE_VERSION ?? "";

  if (!version || !isNewerVersion(version, currentVersion)) {
    return new Response(null, {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 204,
    });
  }

  const signature = readDesktopUpdatePlatformValue(process.env, "DESKTOP_UPDATE_SIGNATURE", target, arch);
  const url = readDesktopUpdatePlatformValue(process.env, "DESKTOP_UPDATE_URL", target, arch);

  if (!signature || !url) {
    return new Response(null, {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 204,
    });
  }

  return Response.json(
    {
      notes: process.env.DESKTOP_UPDATE_NOTES ?? "",
      pub_date: process.env.DESKTOP_UPDATE_PUB_DATE ?? new Date().toISOString(),
      signature,
      url,
      version,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
