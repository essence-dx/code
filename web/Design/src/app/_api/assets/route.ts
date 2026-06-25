import { NextResponse } from "next/server";
import { z } from "zod";

import { createUserAsset, listUserAssets } from "@/db/assets";
import {
  getMaxAssetBytes,
  isAcceptedAssetMimeType,
  maxAssetDataUrlLength,
} from "@/features/assets/asset-constraints";
import { auth } from "@/lib/auth";

const uploadAssetSchema = z
  .object({
    name: z.string().min(1).max(180),
    mimeType: z
      .string()
      .refine(isAcceptedAssetMimeType, "Unsupported asset type"),
    dataUrl: z.string().min(1).max(maxAssetDataUrlLength),
    sizeBytes: z.number().int().positive(),
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
    sourceProvider: z.string().max(80).nullable().optional(),
    sourceUrl: z.string().url().max(1000).nullable().optional(),
    authorName: z.string().max(200).nullable().optional(),
    licenseName: z.string().max(120).nullable().optional(),
    licenseUrl: z.string().url().max(1000).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.sizeBytes > getMaxAssetBytes(value.mimeType)) {
      context.addIssue({
        code: "custom",
        path: ["sizeBytes"],
        message: "Asset is too large for the free upload store.",
      });
    }

    if (!value.dataUrl.startsWith(`data:${value.mimeType}`)) {
      context.addIssue({
        code: "custom",
        path: ["dataUrl"],
        message: "Asset data does not match its MIME type.",
      });
    }
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

  const assets = await listUserAssets(session.user.id);

  return NextResponse.json({ assets });
}

export async function POST(request: Request) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = uploadAssetSchema.parse(await request.json());
  const asset = await createUserAsset({
    userId: session.user.id,
    ...body,
  });

  return NextResponse.json({ asset }, { status: 201 });
}
