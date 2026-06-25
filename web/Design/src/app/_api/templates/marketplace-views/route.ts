import { NextResponse } from "next/server";
import { z } from "zod";

import { incrementDesignTemplateViews } from "@/db/design-templates";
import { auth } from "@/lib/auth";

const marketplaceViewSchema = z.object({
  templateIds: z.array(z.string().min(1).max(120)).max(12),
});

async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function POST(request: Request) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = marketplaceViewSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid template views" }, { status: 400 });
  }

  const tracked = await incrementDesignTemplateViews({
    userId: session.user.id,
    templateIds: parsed.data.templateIds,
  });

  return NextResponse.json({ tracked });
}
