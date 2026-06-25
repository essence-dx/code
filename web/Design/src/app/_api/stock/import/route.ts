import { NextResponse } from "next/server";
import { z } from "zod";

import { createUserAsset } from "@/db/assets";
import { fetchCommonsImageAsAsset } from "@/features/stock/commons";
import { auth } from "@/lib/auth";

const importStockImageSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(180),
  thumbnailUrl: z.string().url().max(1000),
  sourceUrl: z.string().url().max(1000),
  mimeType: z.string().startsWith("image/"),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  authorName: z.string().max(200).nullable(),
  licenseName: z.string().max(120).nullable(),
  licenseUrl: z.string().url().max(1000).nullable(),
  provider: z.literal("Wikimedia Commons"),
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

  const stockImage = importStockImageSchema.parse(await request.json());
  const assetInput = await fetchCommonsImageAsAsset(stockImage);
  const asset = await createUserAsset({
    userId: session.user.id,
    ...assetInput,
  });

  return NextResponse.json({ asset }, { status: 201 });
}
