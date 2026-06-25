import { NextResponse } from "next/server";

import { createWebsiteFormSubmission } from "@/db/website-publishing";

type PublishedSiteSubmitContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(
  request: Request,
  context: PublishedSiteSubmitContext,
) {
  const { slug } = await context.params;
  const formData = await request.formData();
  const sectionId = String(formData.get("sectionId") ?? "");
  const payload = normalizeFormPayload(formData);

  await createWebsiteFormSubmission({
    slug,
    sectionId,
    payload,
  });

  return NextResponse.redirect(
    new URL(`/site/${slug}?submitted=1`, request.url),
    303,
  );
}

function normalizeFormPayload(formData: FormData) {
  const payload: Record<string, string | string[]> = {};
  let fieldCount = 0;

  for (const [key, value] of formData.entries()) {
    if (key === "sectionId") continue;
    if (fieldCount >= 40) break;

    const text = (typeof value === "string" ? value : value.name).slice(0, 2000);
    const currentValue = payload[key];

    if (Array.isArray(currentValue)) {
      currentValue.push(text);
    } else if (typeof currentValue === "string") {
      payload[key] = [currentValue, text];
    } else {
      payload[key] = text;
      fieldCount += 1;
    }
  }

  return payload;
}
