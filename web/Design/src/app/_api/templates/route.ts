import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createDesignTemplate,
  listDesignTemplates,
} from "@/db/design-templates";
import { parseDesignDocument } from "@/features/editor/document-codec";
import { auth } from "@/lib/auth";

const templateSchema = z.object({
  name: z.string().min(1).max(180),
  width: z.number().int().positive().max(10_000),
  height: z.number().int().positive().max(10_000),
  document: z.unknown().transform(parseDesignDocument),
  thumbnail: z.string().startsWith("data:image/").nullable().optional(),
  isBrandTemplate: z.boolean().optional(),
  isTeamTemplate: z.boolean().optional(),
});

async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function GET(request: Request) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await listDesignTemplates(session.user.id);

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = templateSchema.parse(await request.json());
  const template = await createDesignTemplate({
    userId: session.user.id,
    ...body,
  });

  return NextResponse.json({ template }, { status: 201 });
}
