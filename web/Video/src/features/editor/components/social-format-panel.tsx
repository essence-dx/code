"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/features/editor/state/editor-store";
import { createSocialFormatProjectResize, createSocialFormatProjectVariant } from "@/lib/editor/project-variants";
import { socialFormatPresets } from "@/lib/editor/social-format-presets";
import { saveLocalProject } from "@/lib/projects/local-project-store";

export function SocialFormatPanel() {
  const project = useEditorStore((state) => state.project);
  const mediaAssets = useEditorStore((state) => state.mediaAssets);
  const loadProject = useEditorStore((state) => state.loadProject);
  const toggleSafeZones = useEditorStore((state) => state.toggleSafeZones);
  const showSafeZones = useEditorStore((state) => state.showSafeZones);
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>(["youtube-shorts", "tiktok-reel", "instagram-square"]);
  const [variantMessage, setVariantMessage] = useState<string | null>(null);
  const [isSavingVariants, setIsSavingVariants] = useState(false);
  const selectedVariantPresets = useMemo(
    () => socialFormatPresets.filter((preset) => selectedVariantIds.includes(preset.id)),
    [selectedVariantIds],
  );

  function toggleVariant(id: string) {
    setSelectedVariantIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function saveVariants() {
    if (selectedVariantPresets.length === 0 || isSavingVariants) return;

    setIsSavingVariants(true);
    setVariantMessage(null);

    try {
      for (const preset of selectedVariantPresets) {
        await saveLocalProject(createSocialFormatProjectVariant(project, preset), mediaAssets);
      }
      setVariantMessage(`${selectedVariantPresets.length} project variant${selectedVariantPresets.length === 1 ? "" : "s"} saved locally.`);
    } catch {
      setVariantMessage("Project variants could not be saved.");
    } finally {
      setIsSavingVariants(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium">Social formats</h4>
          <p className="text-xs text-muted-foreground">{project.width} x {project.height}</p>
        </div>
        <Button size="sm" variant={showSafeZones ? "secondary" : "outline"} onClick={toggleSafeZones}>
          Safe zones
        </Button>
      </div>
      <div className="grid gap-2">
        {socialFormatPresets.map((preset) => {
          const active = project.socialFormatId
            ? project.socialFormatId === preset.id
            : project.aspectRatio === preset.aspectRatio && project.width === preset.width && project.height === preset.height;
          return (
            <div
              key={preset.id}
              className="rounded-md border border-border p-2 text-left transition-colors hover:border-primary/70"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{preset.label}</span>
                <Badge variant={active ? "default" : "outline"}>{preset.aspectRatio}</Badge>
              </span>
              <span className="mt-1 block text-[11px] text-muted-foreground">
                {preset.platform} - {preset.width} x {preset.height}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{preset.description}</span>
              <span className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {selectedVariantIds.includes(preset.id) ? "Included in variants" : "Variant optional"}
                </span>
                <span className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() => loadProject(createSocialFormatProjectResize(project, preset), mediaAssets)}
                  >
                    Use
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedVariantIds.includes(preset.id) ? "secondary" : "outline"}
                    className="h-7"
                    onClick={() => toggleVariant(preset.id)}
                  >
                    Variant
                  </Button>
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <Button className="w-full" variant="outline" onClick={saveVariants} disabled={selectedVariantPresets.length === 0 || isSavingVariants}>
        {isSavingVariants ? "Saving variants..." : `Save ${selectedVariantPresets.length} local variant${selectedVariantPresets.length === 1 ? "" : "s"}`}
      </Button>
      {variantMessage ? <p className="text-xs text-muted-foreground">{variantMessage}</p> : null}
    </div>
  );
}
