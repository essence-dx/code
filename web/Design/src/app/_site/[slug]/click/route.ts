import { NextResponse } from "next/server";

import { recordWebsiteAnalyticsEventBySlug } from "@/db/website-publishing";

type PublishedSiteClickContext = {
  params: Promise<{
    slug: string;
  }>;
};

type ClickPayload = {
  sectionId?: string | null;
  target?: string | null;
  path?: string | null;
};

export async function POST(
  request: Request,
  context: PublishedSiteClickContext,
) {
  const { slug } = await context.params;
  const body = await readClickPayload(request);

  try {
    await recordWebsiteAnalyticsEventBySlug({
      slug,
      eventType: "click",
      sectionId: body.sectionId,
      target: body.target,
      path: body.path,
      referrer: request.headers.get("referer"),
      userAgent: request.headers.get("user-agent"),
    });
  } catch (error) {
    console.error("Failed to record website click", error);
  }

  return NextResponse.json({ ok: true });
}

async function readClickPayload(request: Request): Promise<ClickPayload> {
  try {
    const payload = (await request.json()) as unknown;

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return {};
    }

    return payload as {
      sectionId?: string | null;
      target?: string | null;
      path?: string | null;
    };
  } catch {
    return {};
  }
}
