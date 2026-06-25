import { NextResponse } from "next/server";
import { z } from "zod";

import { listBrandFonts, saveBrandFont } from "@/db/brand-fonts";
import { auth } from "@/lib/auth";

const brandFontSchema = z.object({
  role: z.enum(["heading", "subheading", "body", "caption"]),
  fontFamily: z.string().min(1).max(120),
  fontSize: z.number().int().min(6).max(320),
  fontWeight: z.number().int().min(100).max(900),
  letterSpacing: z.number().min(-20).max(80),
  lineHeight: z.number().min(0.6).max(4),
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

  const fonts = await listBrandFonts(session.user.id);

  return NextResponse.json({ fonts });
}

export async function POST(request: Request) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = brandFontSchema.parse(await request.json());
  const font = await saveBrandFont({
    userId: session.user.id,
    ...body,
  });

  return NextResponse.json({ font }, { status: 201 });
}
