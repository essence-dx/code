"use client";

import { useMemo } from "react";
import { CheckCircle2, FileCheck2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createExportManifest, type ExportManifestReadiness } from "../../utils/export-manifest";
import type { SceneDocument } from "../../types";

const formats = [
  { key: "json", label: "JSON" },
  { key: "web", label: "Web" },
  { key: "glb", label: "GLB" },
  { key: "stl", label: "STL" },
  { key: "usdz", label: "USDZ" },
] as const;

function getStatusLabel(status: ExportManifestReadiness["status"]) {
  if (status === "review") {
    return "Review";
  }

  if (status === "partial") {
    return "Partial";
  }

  return "Ready";
}

function getStatusVariant(status: ExportManifestReadiness["status"]) {
  return status === "review" ? "destructive" : "secondary";
}

export function ExportReadinessPanel({ document }: { document: SceneDocument }) {
  const manifest = useMemo(() => createExportManifest(document), [document]);
  const reviewCount = formats.filter((format) => manifest.readiness[format.key].status !== "ready").length;
  const objectsWithFormatNotes = manifest.objects.filter((object) => object.visible && Object.values(object.support).some((support) => support === "simplified" || support === "unsupported"));
  const partialObjectCount = objectsWithFormatNotes.length;

  return (
    <div className="space-y-3 rounded-md border border-border p-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <FileCheck2 className="size-4 shrink-0" />
          <span className="truncate">Export readiness</span>
        </div>
        <Badge className="rounded-md text-[11px]" variant={reviewCount > 0 ? "secondary" : "default"}>
          {reviewCount > 0 ? `${reviewCount} notes` : "Ready"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-muted/50 p-2">
          <span className="block font-mono text-sm text-foreground">{manifest.summary.visibleObjectCount}</span>
          <span className="text-muted-foreground">Visible objects</span>
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <span className="block font-mono text-sm text-foreground">{partialObjectCount}</span>
          <span className="text-muted-foreground">Format notes</span>
        </div>
      </div>

      <div className="space-y-1">
        {formats.map((format) => {
          const readiness = manifest.readiness[format.key];
          const Icon = readiness.status === "ready" ? CheckCircle2 : TriangleAlert;

          return (
            <div key={format.key} className="grid grid-cols-[18px_48px_1fr] items-start gap-2 rounded-md bg-muted/50 p-2 text-xs">
              <Icon className={readiness.status === "ready" ? "mt-0.5 size-3.5 text-emerald-500" : "mt-0.5 size-3.5 text-amber-500"} />
              <span className="font-medium">{format.label}</span>
              <div className="min-w-0 space-y-1">
                <Badge className="rounded-md text-[10px]" variant={getStatusVariant(readiness.status)}>
                  {getStatusLabel(readiness.status)}
                </Badge>
                {readiness.unsupportedObjectKinds.length > 0 ? <p className="text-muted-foreground">{readiness.unsupportedObjectKinds.join(", ")}</p> : null}
                {readiness.notes[0] ? <p className="text-muted-foreground">{readiness.notes[0]}</p> : null}
              </div>
            </div>
          );
        })}
      </div>

      {objectsWithFormatNotes.length > 0 ? (
        <div className="space-y-1">
          {objectsWithFormatNotes.slice(0, 4).map((object) => {
            const limitedFormats = formats
              .filter((format) => object.support[format.key] === "simplified" || object.support[format.key] === "unsupported")
              .map((format) => `${format.label}: ${object.support[format.key]}`);

            return (
              <div key={object.id} className="rounded-md bg-muted/50 p-2 text-xs">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate font-medium">{object.name}</span>
                  <Badge className="rounded-md text-[10px]" variant="secondary">
                    {object.kind}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{limitedFormats.join(", ")}</p>
                {object.notes[0] ? <p className="mt-1 text-muted-foreground">{object.notes[0]}</p> : null}
              </div>
            );
          })}
          {objectsWithFormatNotes.length > 4 ? <p className="px-2 text-xs text-muted-foreground">{objectsWithFormatNotes.length - 4} more object notes in the manifest.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
