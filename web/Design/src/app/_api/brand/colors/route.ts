import { NextResponse } from "next/server";
import { z } from "zod";

import { createBrandColor, listBrandColors } from "@/db/brand-colors";
import { auth } from "@/lib/auth";

const brandColorSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
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

  const colors = await listBrandColors(session.user.id);

  return NextResponse.json({ colors });
}

export async function POST(request: Request) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = brandColorSchema.parse(await request.json());
  const color = await createBrandColor({
    userId: session.user.id,
    color: body.color,
  });

  return NextResponse.json({ color }, { status: 201 });
}
