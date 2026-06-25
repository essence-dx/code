"use client";

import { useState, type ChangeEvent } from "react";
import { Download, Plus, Trash2, Upload, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAudioLibraryFile,
  parseAudioLibraryFile,
  serializeAudioLibraryFile,
} from "../../scene/audio-library";
import { useEditorStore } from "../../store/editor-store";
import type { SceneAudioAsset } from "../../types";
import { getFileExtension } from "../../utils/file-readers";
import { getSafeSceneFileName } from "../../utils/scene-io";

const maxLibraryBytes = 16 * 1024 * 1024;
const emptyAudioAssets: SceneAudioAsset[] = [];

export function AudioAssetLibrarySection() {
  const [message, setMessage] = useState<string | null>(null);
  const documentName = useEditorStore((state) => state.document.name);
  const audioAssets = useEditorStore(
    (state) => state.document.audioAssets ?? emptyAudioAssets,
  );
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectedObject = useEditorStore((state) =>
    state.document.objects.find((object) => object.id === selectedObjectId),
  );
  const createAudioAssetFromSelection = useEditorStore(
    (state) => state.createAudioAssetFromSelection,
  );
  const instantiateAudioAsset = useEditorStore(
    (state) => state.instantiateAudioAsset,
  );
  const deleteAudioAsset = useEditorStore((state) => state.deleteAudioAsset);
  const importAudioAssets = useEditorStore((state) => state.importAudioAssets);
  const canSaveSelection =
    selectedObject?.kind === "audio" && Boolean(selectedObject.audio);

  function handleSaveSelectedAudio() {
    if (!selectedObject || !canSaveSelection) {
      setMessage("Select an audio object first.");
      return;
    }

    createAudioAssetFromSelection();
    setMessage(`${selectedObject.name} saved to audio library.`);
  }

  function handleExport() {
    if (audioAssets.length === 0) {
      setMessage("Save audio before exporting a library.");
      return;
    }

    const library = createAudioLibraryFile(
      `${documentName} Audio Library`,
      audioAssets,
    );
    const blob = new Blob([serializeAudioLibraryFile(library)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");

    anchor.href = url;
    anchor.download = getSafeSceneFileName(
      `${documentName}-audio`,
      "essenceaudio",
    );
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setMessage(
      `${audioAssets.length} audio asset${audioAssets.length === 1 ? "" : "s"} exported.`,
    );
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    const extension = getFileExtension(file.name);

    if (extension !== "json" && extension !== "essenceaudio") {
      setMessage("Choose a JSON or .essenceaudio file.");
      return;
    }

    if (file.size > maxLibraryBytes) {
      setMessage("Library must be 16 MB or smaller.");
      return;
    }

    try {
      const library = parseAudioLibraryFile(await file.text());
      importAudioAssets(library.audio);
      setMessage(
        `Imported ${library.audio.length} audio asset${library.audio.length === 1 ? "" : "s"} from ${library.name}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Audio library import failed.",
      );
    }
  }

  return (
    <div className="space-y-1 pt-1">
      <div className="flex items-center justify-between gap-2 px-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Saved Audio
        </div>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Save selected audio"
            className="size-7"
            disabled={!canSaveSelection}
            size="icon"
            variant="ghost"
            onClick={handleSaveSelectedAudio}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            aria-label="Export audio library"
            className="size-7"
            disabled={audioAssets.length === 0}
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
            <span className="truncate">Import audio library</span>
          </div>
          <Badge className="rounded-md text-[11px]" variant="secondary">
            JSON
          </Badge>
        </div>
        <Label className="sr-only" htmlFor="audio-library-upload">
          Import audio library
        </Label>
        <Input
          id="audio-library-upload"
          accept=".essenceaudio,.json,application/json"
          className="mt-2"
          type="file"
          onChange={handleImport}
        />
        {message ? (
          <p className="mt-2 text-xs text-muted-foreground">{message}</p>
        ) : null}
      </div>
      {audioAssets.length > 0 ? (
        audioAssets.map((asset) => (
          <div key={asset.id} className="grid grid-cols-[1fr_32px] gap-1">
            <Button
              className="grid h-auto min-w-0 grid-cols-[20px_1fr] justify-start gap-2 px-2 py-2 text-left"
              type="button"
              variant="ghost"
              onClick={() => instantiateAudioAsset(asset.id)}
            >
              <Volume2 className="size-4 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate">{asset.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {asset.audio.loop ? "Loop" : "One shot"} ·{" "}
                  {Math.round(asset.audio.volume * 100)}%
                </span>
              </span>
            </Button>
            <Button
              aria-label={`Delete ${asset.name}`}
              className="size-8 self-center"
              size="icon"
              variant="ghost"
              onClick={() => deleteAudioAsset(asset.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))
      ) : (
        <div className="grid grid-cols-[20px_1fr] gap-2 px-2 py-2 text-xs text-muted-foreground">
          <Volume2 className="size-4" />
          <span>No saved audio yet.</span>
        </div>
      )}
    </div>
  );
}
