"use client";

import { VectorPackGrid } from "@/features/editor/components/vector-pack-grid";
import type { VectorPackItem } from "@/features/editor/vector-packs";

type AssetVectorPacksPanelProps = {
  onAddVector: (item: VectorPackItem) => void;
};

export function AssetVectorPacksPanel({
  onAddVector,
}: AssetVectorPacksPanelProps) {
  return (
    <section className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">
          Vector packs
        </h3>
        <span className="text-xs text-muted-foreground">Original</span>
      </div>
      <VectorPackGrid onAddVector={onAddVector} />
    </section>
  );
}
