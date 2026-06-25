"use client";

import { useEffect, useMemo } from "react";
import { useEditorStore } from "@/features/editor/state/editor-store";
import { normalizeBrandKitSettings } from "@/lib/editor/brand-kit";
import { loadBrandFontFaces } from "@/lib/media/brand-font-store";

export function BrandFontLoader() {
  const brandKit = useEditorStore((state) => state.project.brandKit);
  const fontAssets = useMemo(() => normalizeBrandKitSettings(brandKit).fontAssets, [brandKit]);
  const fontAssetKey = fontAssets.map((asset) => `${asset.id}:${asset.storageKey}`).join("|");

  useEffect(() => {
    if (!fontAssets.length) return;
    void loadBrandFontFaces(fontAssets);
  }, [fontAssetKey, fontAssets]);

  return null;
}
