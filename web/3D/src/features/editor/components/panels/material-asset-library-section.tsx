"use client";

import { useState, type ChangeEvent } from "react";
import { Download, Palette, Plus, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createMaterialLibraryFile,
  parseMaterialLibraryFile,
  serializeMaterialLibraryFile,
} from "../../scene/material-library";
import { useEditorStore } from "../../store/editor-store";
import type { Material, PrimitiveKind, SceneMaterialAsset } from "../../types";
import { getFileExtension } from "../../utils/file-readers";
import { getSafeSceneFileName } from "../../utils/scene-io";

const maxLibraryBytes = 8 * 1024 * 1024;
const emptyMaterialAssets: SceneMaterialAsset[] = [];

function supportsMaterial(kind: PrimitiveKind) {
  return (
    kind !== "pointLight" &&
    kind !== "directionalLight" &&
    kind !== "spotLight" &&
    kind !== "camera" &&
    kind !== "group" &&
    kind !== "model" &&
    kind !== "image" &&
    kind !== "video" &&
    kind !== "audio" &&
    kind !== "svg" &&
    kind !== "figma"
  );
}

function getAppliedMaterial(material: Material): Material {
  return {
    ...material,
    textureDataUrl: material.textureDataUrl ?? null,
    layers: material.layers ?? [],
  };
}

export function MaterialAssetLibrarySection() {
  const [message, setMessage] = useState<string | null>(null);
  const documentName = useEditorStore((state) => state.document.name);
  const materialAssets = useEditorStore(
    (state) => state.document.materialAssets ?? emptyMaterialAssets,
  );
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectedObject = useEditorStore((state) =>
    state.document.objects.find((object) => object.id === selectedObjectId),
  );
  const createMaterialAssetFromSelection = useEditorStore(
    (state) => state.createMaterialAssetFromSelection,
  );
  const deleteMaterialAsset = useEditorStore(
    (state) => state.deleteMaterialAsset,
  );
  const importMaterialAssets = useEditorStore(
    (state) => state.importMaterialAssets,
  );
  const updateMaterial = useEditorStore((state) => state.updateMaterial);
  const canUseSelection = selectedObject
    ? supportsMaterial(selectedObject.kind)
    : false;

  function handleSaveSelectedMaterial() {
    if (!selectedObject || !canUseSelection) {
      setMessage("Select a material-supported object first.");
      return;
    }

    createMaterialAssetFromSelection();
    setMessage(`${selectedObject.name} material saved.`);
  }

  function handleExport() {
    if (materialAssets.length === 0) {
      setMessage("Save a material before exporting a library.");
      return;
    }

    const library = createMaterialLibraryFile(
      `${documentName} Material Library`,
      materialAssets,
    );
    const blob = new Blob([serializeMaterialLibraryFile(library)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");

    anchor.href = url;
    anchor.download = getSafeSceneFileName(
      `${documentName}-materials`,
      "essencematerials",
    );
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setMessage(
      `${materialAssets.length} material${materialAssets.length === 1 ? "" : "s"} exported.`,
    );
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    const extension = getFileExtension(file.name);

    if (extension !== "json" && extension !== "essencematerials") {
      setMessage("Choose a JSON or .essencematerials file.");
      return;
    }

    if (file.size > maxLibraryBytes) {
      setMessage("Library must be 8 MB or smaller.");
      return;
    }

    try {
      const library = parseMaterialLibraryFile(await file.text());
      importMaterialAssets(library.materials);
      setMessage(
        `Imported ${library.materials.length} material${library.materials.length === 1 ? "" : "s"} from ${library.name}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Material import failed.",
      );
    }
  }

  return (
    <div className="space-y-1 pt-1">
      <div className="flex items-center justify-between gap-2 px-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Saved Materials
        </div>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Save selected material"
            className="size-7"
            disabled={!canUseSelection}
            size="icon"
            variant="ghost"
            onClick={handleSaveSelectedMaterial}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            aria-label="Export material library"
            className="size-7"
            disabled={materialAssets.length === 0}
            size="icon"
            variant="ghost"
            onClick={handleExport}
          >
            <Download className="size-4" />
          </Button>
        </div>
      </div>
      <div className="rounded-md border border-border p-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <Upload className="size-4 shrink-0" />
            <span className="truncate">Import materials</span>
          </div>
          <Badge className="rounded-md text-[11px]" variant="secondary">
            JSON
          </Badge>
        </div>
        <Label className="sr-only" htmlFor="material-library-upload">
          Import material library
        </Label>
        <Input
          id="material-library-upload"
          accept=".essencematerials,.json,application/json"
          className="mt-2"
          type="file"
          onChange={handleImport}
        />
        {message ? (
          <p className="mt-2 text-xs text-muted-foreground">{message}</p>
        ) : null}
      </div>
      {materialAssets.length > 0 ? (
        materialAssets.map((asset) => (
          <div key={asset.id} className="grid grid-cols-[1fr_32px] gap-1">
            <Button
              className={cn(
                "grid h-auto min-w-0 grid-cols-[24px_1fr] justify-start gap-2 px-2 py-2 text-left",
                canUseSelection
                  ? "text-muted-foreground hover:bg-accent hover:text-foreground"
                  : "cursor-not-allowed text-muted-foreground/50",
              )}
              disabled={!canUseSelection || !selectedObject}
              type="button"
              variant="ghost"
              onClick={() =>
                selectedObject &&
                updateMaterial(
                  selectedObject.id,
                  getAppliedMaterial(asset.material),
                )
              }
            >
              <span
                className="size-5 rounded border border-border"
                style={{ backgroundColor: asset.material.color }}
              />
              <span className="min-w-0">
                <span className="block truncate">{asset.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {asset.material.layers?.length ?? 0} layer
                  {(asset.material.layers?.length ?? 0) === 1 ? "" : "s"}
                </span>
              </span>
            </Button>
            <Button
              aria-label={`Delete ${asset.name}`}
              className="size-8 self-center"
              size="icon"
              variant="ghost"
              onClick={() => deleteMaterialAsset(asset.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))
      ) : (
        <div className="grid grid-cols-[20px_1fr] gap-2 px-2 py-2 text-xs text-muted-foreground">
          <Palette className="size-4" />
          <span>No saved materials yet.</span>
        </div>
      )}
    </div>
  );
}
