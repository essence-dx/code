"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SpreadsheetGrid,
  type SpreadsheetGridProps,
} from "@/features/spreadsheet/components/spreadsheet-grid";
import type { SheetSplitPaneMode } from "@/features/workbooks/types";
import { cn } from "@/lib/utils";

export type SplitPaneMode = SheetSplitPaneMode;

type PaneDefinition = {
  id: string;
  label: string;
};

export type WorkbookWindowPaneDefinition = PaneDefinition & {
  gridProps: SpreadsheetGridProps;
  isActive: boolean;
  onActivate: () => void;
};

export function SpreadsheetGridPanes({
  splitPaneMode,
  workbookWindowPanes,
  ...gridProps
}: SpreadsheetGridProps & {
  splitPaneMode: SplitPaneMode;
  workbookWindowPanes?: WorkbookWindowPaneDefinition[];
}) {
  const paneMode = workbookWindowPanes?.length
    ? getWorkbookWindowSplitPaneMode(workbookWindowPanes.length)
    : splitPaneMode;
  const panes = useMemo(
    () => workbookWindowPanes ?? getPaneDefinitions(splitPaneMode),
    [splitPaneMode, workbookWindowPanes],
  );
  const [activePaneId, setActivePaneId] = useState(panes[0]?.id ?? "main");

  useEffect(() => {
    if (!panes.some((pane) => pane.id === activePaneId)) {
      setActivePaneId(panes[0]?.id ?? "main");
    }
  }, [activePaneId, panes]);

  return (
    <div
      className={cn(
        "grid min-h-0 min-w-0 flex-1 overflow-hidden gap-1 bg-border",
        paneMode === "vertical" && "grid-rows-2 md:grid-cols-2 md:grid-rows-none",
        paneMode === "horizontal" && "grid-rows-2",
        paneMode === "quad" && "grid-rows-4 md:grid-cols-2 md:grid-rows-2",
      )}
    >
      {panes.map((pane) => {
        const isWindowPane = isWorkbookWindowPaneDefinition(pane);
        const paneGridProps = isWindowPane ? pane.gridProps : gridProps;

        return (
          <section
            key={pane.id}
            aria-label={pane.label}
            className={cn(
              "flex min-h-0 min-w-0 flex-col bg-background",
              isWindowPane && pane.isActive && "ring-1 ring-primary",
            )}
            onFocusCapture={() => {
              setActivePaneId(pane.id);
              if (isWindowPane) {
                pane.onActivate();
              }
            }}
            onPointerDownCapture={() => {
              setActivePaneId(pane.id);
              if (isWindowPane) {
                pane.onActivate();
              }
            }}
          >
            {isWindowPane ? (
              <div className="flex h-7 shrink-0 items-center justify-between border-b bg-muted/40 px-2 text-xs font-medium text-muted-foreground">
                <span className="truncate">{pane.label}</span>
                {pane.isActive ? (
                  <span className="ml-2 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-normal text-primary">
                    Active
                  </span>
                ) : null}
              </div>
            ) : null}
            <SpreadsheetGrid
              {...paneGridProps}
              autoScrollSelection={
                paneMode === "none" || activePaneId === pane.id
              }
            />
          </section>
        );
      })}
    </div>
  );
}

function getPaneDefinitions(splitPaneMode: SplitPaneMode): PaneDefinition[] {
  if (splitPaneMode === "vertical") {
    return [
      { id: "left", label: "Left worksheet pane" },
      { id: "right", label: "Right worksheet pane" },
    ];
  }

  if (splitPaneMode === "horizontal") {
    return [
      { id: "top", label: "Top worksheet pane" },
      { id: "bottom", label: "Bottom worksheet pane" },
    ];
  }

  if (splitPaneMode === "quad") {
    return [
      { id: "top-left", label: "Top left worksheet pane" },
      { id: "top-right", label: "Top right worksheet pane" },
      { id: "bottom-left", label: "Bottom left worksheet pane" },
      { id: "bottom-right", label: "Bottom right worksheet pane" },
    ];
  }

  return [{ id: "main", label: "Worksheet pane" }];
}

function getWorkbookWindowSplitPaneMode(paneCount: number): SplitPaneMode {
  if (paneCount === 2) {
    return "vertical";
  }

  if (paneCount > 2) {
    return "quad";
  }

  return "none";
}

function isWorkbookWindowPaneDefinition(
  pane: PaneDefinition | WorkbookWindowPaneDefinition,
): pane is WorkbookWindowPaneDefinition {
  return "gridProps" in pane;
}
