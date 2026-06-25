"use client";

import { BarChart3, Download, FileSpreadsheet, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDataRefreshDiagnostics,
  createDataReportHandoffBundle,
  type DataVizStatus,
} from "@/features/editor/data-visualization-diagnostics";
import {
  createDataDashboardTemplateElements,
  dataDashboardTemplates,
  type DataDashboardTemplateId,
} from "@/features/editor/data-visualization-templates";
import {
  dataChartThemes,
  type DataChartThemeId,
} from "@/features/editor/data-visualization-themes";
import type {
  DesignDocument,
  DesignElement,
  DesignPage,
} from "@/features/editor/types";

type DataVisualizationPanelProps = {
  document: DesignDocument;
  activePage: DesignPage | undefined;
  onAddElements: (elements: DesignElement[]) => void;
};

export function DataVisualizationPanel({
  document,
  activePage,
  onAddElements,
}: DataVisualizationPanelProps) {
  const [templateId, setTemplateId] =
    useState<DataDashboardTemplateId>("executive-kpi");
  const [themeId, setThemeId] = useState<DataChartThemeId>("executive");
  const diagnostics = useMemo(
    () => createDataRefreshDiagnostics(document, activePage?.id),
    [activePage?.id, document],
  );
  const blockedCount = diagnostics.filter((item) => item.status === "blocked")
    .length;
  const reviewCount = diagnostics.filter((item) => item.status === "review")
    .length;
  const status: DataVizStatus = blockedCount
    ? "blocked"
    : reviewCount
      ? "review"
      : "ready";

  function addDashboardTemplate() {
    onAddElements(
      createDataDashboardTemplateElements({
        templateId,
        themeId,
        canvasWidth: activePage?.width ?? document.width,
      }),
    );
  }

  function downloadHandoffBundle() {
    const bundle = createDataReportHandoffBundle(document, activePage?.id);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");

    link.href = url;
    link.download = `${bundle.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <details className="group rounded-md border border-border bg-muted/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex min-w-0 items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">Data visualization</span>
        </span>
        <Badge variant={getStatusVariant(status)}>{formatStatus(status)}</Badge>
      </summary>

      <div className="space-y-3 border-t border-border p-3">
        <p className="text-xs text-muted-foreground">
          Dashboard starters, chart themes, refresh checks, and report handoff
          bundles.
        </p>

        <div className="grid gap-2">
          <Select
            value={templateId}
            onValueChange={(value) =>
              setTemplateId(value as DataDashboardTemplateId)
            }
          >
            <SelectTrigger aria-label="Dashboard template">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dataDashboardTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={themeId}
            onValueChange={(value) => setThemeId(value as DataChartThemeId)}
          >
            <SelectTrigger aria-label="Chart theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dataChartThemes.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  {theme.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="h-8 min-w-0 justify-start px-2 text-xs"
            onClick={addDashboardTemplate}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Add dashboard
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 min-w-0 justify-start px-2 text-xs"
            onClick={downloadHandoffBundle}
          >
            <Download className="h-4 w-4" />
            Download handoff
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh diagnostics
          </div>
          {diagnostics.slice(0, 4).map((diagnostic) => (
            <div
              key={diagnostic.id}
              className="rounded-md border border-border bg-background p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium">
                  {diagnostic.label}
                </p>
                <Badge variant={getStatusVariant(diagnostic.status)}>
                  {formatStatus(diagnostic.status)}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {diagnostic.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

function getStatusVariant(status: DataVizStatus) {
  if (status === "blocked") return "destructive" as const;
  if (status === "ready") return "secondary" as const;

  return "outline" as const;
}

function formatStatus(status: DataVizStatus) {
  if (status === "blocked") return "Blocked";
  if (status === "ready") return "Ready";

  return "Review";
}
