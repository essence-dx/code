import { NextResponse } from "next/server";
import { z } from "zod";

import { createBrandLogo, listBrandLogos } from "@/db/brand-logos";
import {
  isAcceptedImageMimeType,
  maxAssetBytes,
} from "@/features/assets/asset-constraints";
import { auth } from "@/lib/auth";

const brandLogoSchema = z.object({
  name: z.string().min(1).max(180),
  mimeType: z
    .string()
    .refine(isAcceptedImageMimeType, "Unsupported image type"),
  dataUrl: z.string().min(1).max(3_800_000).startsWith("data:image/"),
  sizeBytes: z.number().int().positive().max(maxAssetBytes),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
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

  const logos = await listBrandLogos(session.user.id);

  return NextResponse.json({ logos });
}

export async function POST(request: Request) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = brandLogoSchema.parse(await request.json());
  const logo = await createBrandLogo({
    userId: session.user.id,
    ...body,
  });

  return NextResponse.json({ logo }, { status: 201 });
}
