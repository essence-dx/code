"use client";

import { FileDown, FileUp, Workflow } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createMermaidDiagramElements,
  exportPageToMermaid,
  mermaidStarterDiagram,
} from "@/features/editor/mermaid-diagram";
import type { DesignElement, DesignPage } from "@/features/editor/types";

type MermaidDiagramPanelProps = {
  page: DesignPage;
  onAddElements: (elements: DesignElement[]) => void;
};

export function MermaidDiagramPanel({
  page,
  onAddElements,
}: MermaidDiagramPanelProps) {
  const [source, setSource] = useState(mermaidStarterDiagram);
  const [status, setStatus] = useState("Ready to import Mermaid flowcharts.");

  function importMermaidDiagram() {
    const result = createMermaidDiagramElements(source);

    if (result.elements.length === 0) {
      setStatus(result.warnings[0] ?? "No diagram layers were created.");
      return;
    }

    onAddElements(result.elements);
    setStatus(
      result.warnings.length
        ? `Imported ${result.elements.length} layers with ${result.warnings.length} warning.`
        : `Imported ${result.elements.length} editable diagram layers.`,
    );
  }

  function exportMermaidDiagram() {
    const mermaid = exportPageToMermaid(page);
    setSource(mermaid);
    setStatus("Exported the current page to Mermaid flowchart syntax.");
  }

  return (
    <details className="group rounded-md border border-border bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex min-w-0 items-center gap-2">
          <Workflow className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">Mermaid</span>
        </span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground group-open:hidden">
          Open
        </span>
        <span className="hidden text-[10px] uppercase tracking-wide text-muted-foreground group-open:inline">
          Close
        </span>
      </summary>
      <div className="space-y-2 border-t border-border p-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
        <Workflow className="h-3.5 w-3.5 text-muted-foreground" />
        Mermaid
        </div>
      <Textarea
        value={source}
        onChange={(event) => setSource(event.target.value)}
          className="min-h-28 w-full min-w-0 max-w-full resize-y overflow-x-hidden font-mono text-xs"
        spellCheck={false}
        aria-label="Mermaid diagram source"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
            className="h-8 min-w-0 justify-start px-2 text-xs"
          onClick={importMermaidDiagram}
        >
          <FileUp className="h-3.5 w-3.5" />
          Import
        </Button>
        <Button
          type="button"
          variant="outline"
            className="h-8 min-w-0 justify-start px-2 text-xs"
          onClick={exportMermaidDiagram}
        >
          <FileDown className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{status}</p>
      </div>
    </details>
  );
}
