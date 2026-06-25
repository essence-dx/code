"use client";

import { useState, type ChangeEvent } from "react";
import { Download, Layers3, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createComponentLibraryFile,
  parseComponentLibraryFile,
  serializeComponentLibraryFile,
} from "../../scene/component-library";
import { useEditorStore } from "../../store/editor-store";
import type { SceneComponent } from "../../types";
import { getFileExtension } from "../../utils/file-readers";
import { getSafeSceneFileName } from "../../utils/scene-io";

const maxLibraryBytes = 8 * 1024 * 1024;
const emptyComponents: SceneComponent[] = [];

export function ComponentLibrarySection() {
  const [message, setMessage] = useState<string | null>(null);
  const documentName = useEditorStore((state) => state.document.name);
  const components = useEditorStore(
    (state) => state.document.components ?? emptyComponents,
  );
  const instantiateComponent = useEditorStore(
    (state) => state.instantiateComponent,
  );
  const deleteComponent = useEditorStore((state) => state.deleteComponent);
  const importComponentLibrary = useEditorStore(
    (state) => state.importComponentLibrary,
  );

  function handleExport() {
    if (components.length === 0) {
      setMessage("Create a component before exporting a library.");
      return;
    }

    const library = createComponentLibraryFile(
      `${documentName} Component Library`,
      components,
    );
    const blob = new Blob([serializeComponentLibraryFile(library)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");

    anchor.href = url;
    anchor.download = getSafeSceneFileName(
      `${documentName}-components`,
      "essencelibrary",
    );
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setMessage(
      `${components.length} component${components.length === 1 ? "" : "s"} exported.`,
    );
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    const extension = getFileExtension(file.name);

    if (extension !== "json" && extension !== "essencelibrary") {
      setMessage("Choose a JSON or .essencelibrary file.");
      return;
    }

    if (file.size > maxLibraryBytes) {
      setMessage("Library must be 8 MB or smaller.");
      return;
    }

    try {
      const library = parseComponentLibraryFile(await file.text());
      importComponentLibrary(library.components);
      setMessage(
        `Imported ${library.components.length} component${library.components.length === 1 ? "" : "s"} from ${library.name}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Library import failed.",
      );
    }
  }

  return (
    <div className="space-y-1 pt-1">
      <div className="flex items-center justify-between gap-2 px-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Component Library
        </div>
        <Button
          aria-label="Export component library"
          className="size-7"
          disabled={components.length === 0}
          size="icon"
          variant="ghost"
          onClick={handleExport}
        >
          <Download className="size-4" />
        </Button>
      </div>
      <div className="rounded-md border border-border p-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <Upload className="size-4 shrink-0" />
            <span className="truncate">Import library</span>
          </div>
          <Badge className="rounded-md text-[11px]" variant="secondary">
            JSON
          </Badge>
        </div>
        <Label className="sr-only" htmlFor="component-library-upload">
          Import component library
        </Label>
        <Input
          id="component-library-upload"
          accept=".essencelibrary,.json,application/json"
          className="mt-2"
          type="file"
          onChange={handleImport}
        />
        {message ? (
          <p className="mt-2 text-xs text-muted-foreground">{message}</p>
        ) : null}
      </div>
      {components.length > 0 ? (
        components.map((component) => (
          <div key={component.id} className="grid grid-cols-[1fr_32px] gap-1">
            <Button
              className="grid h-auto min-w-0 grid-cols-[20px_1fr] justify-start gap-2 px-2 py-2 text-left"
              type="button"
              variant="ghost"
              onClick={() => instantiateComponent(component.id)}
            >
              <Layers3 className="size-4 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate">{component.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {component.objects.length} object
                  {component.objects.length === 1 ? "" : "s"}
                </span>
              </span>
            </Button>
            <Button
              aria-label={`Delete ${component.name}`}
              className="size-8 self-center"
              size="icon"
              variant="ghost"
              onClick={() => deleteComponent(component.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))
      ) : (
        <p className="px-2 py-2 text-xs text-muted-foreground">
          No saved components yet.
        </p>
      )}
    </div>
  );
}
