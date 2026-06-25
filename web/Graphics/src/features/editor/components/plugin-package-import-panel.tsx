"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileJson2, PackageCheck, RotateCcw, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  pluginPermissionLabels,
  type EditorPluginManifest,
} from "@/features/editor/editor-plugin-api";
import {
  getPluginPackageImportBundleJson,
  getPluginPackageImportCsv,
  getPluginPackageImportMarkdown,
  getPluginPackageImportReport,
  type PluginPackageImportCategory,
  type PluginPackageImportReport,
  type PluginPackageImportRow,
  type PluginPackageImportStatus,
} from "@/features/editor/plugin-package-import";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import { cn } from "@/lib/utils";

type PluginPackageImportPanelProps = {
  installedManifests: EditorPluginManifest[];
  onRecordActivity?: (label: string, detail?: string) => void;
};

type PluginPackageImportFilter =
  | "all"
  | PluginPackageImportStatus
  | PluginPackageImportCategory;

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "schema", label: "Schema" },
  { id: "permission", label: "Perms" },
  { id: "dependency", label: "Deps" },
  { id: "catalog", label: "Catalog" },
] as const satisfies ReadonlyArray<{
  id: PluginPackageImportFilter;
  label: string;
}>;

export function PluginPackageImportPanel({
  installedManifests,
  onRecordActivity,
}: PluginPackageImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<PluginPackageImportFilter>("all");
  const [report, setReport] = useState<PluginPackageImportReport>(() =>
    getPluginPackageImportReport({ installedManifests }),
  );
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );
  const importedPackage = report.manifest;

  async function importPackage(file: File | null) {
    if (!file) {
      return;
    }

    const nextReport = getPluginPackageImportReport({
      filename: file.name,
      installedManifests,
      text: await file.text(),
    });

    setReport(nextReport);
    setFilter(nextReport.status === "ready" ? "all" : nextReport.status);
    onRecordActivity?.(
      "Validated local plugin package",
      `${file.name}: ${nextReport.status} score ${nextReport.score}`,
    );

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function resetImport() {
    setReport(getPluginPackageImportReport({ installedManifests }));
    setFilter("all");
    onRecordActivity?.("Reset plugin package import review");
  }

  function exportCsv() {
    downloadTextFile({
      content: getPluginPackageImportCsv({ ...report, rows: visibleRows }),
      filename: `plugin-package-import-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin package import CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getPluginPackageImportMarkdown({
        ...report,
        rows: visibleRows,
      }),
      filename: `plugin-package-import-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin package import handoff",
      `${visibleRows.length} rows`,
    );
  }

  function exportBundle() {
    downloadTextFile({
      content: getPluginPackageImportBundleJson(report),
      filename: "plugin-package-catalog.bundle.json",
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin package catalog bundle",
      importedPackage?.package.name ?? `${report.installedManifestCount} installed entries`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <PackageCheck className="size-3.5" />
            Package import
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Local plugin and widget manifest checks, dependencies, permission diffs, and catalog bundles.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => void importPackage(event.target.files?.[0] ?? null)}
      />

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Catalog" value={report.installedManifestCount} />
        <Metric label="Commands" value={report.commandCount} />
        <Metric label="Widgets" value={report.widgetCount} />
        <Metric label="Deps" value={report.dependencyCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Perms" value={report.declaredPermissionCount} />
        <Metric label="Diffs" value={report.permissionDiffCount} />
        <Metric label="Unused" value={report.unusedPermissionCount} />
        <Metric label="Rows" value={report.rows.length} />
      </div>

      {importedPackage ? (
        <div className="mt-2 rounded-sm border border-border/70 bg-muted/20 p-2 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-medium">
                {importedPackage.package.name}
              </div>
              <div className="mt-1 truncate text-[11px] text-muted-foreground">
                {importedPackage.package.id} / v{importedPackage.package.version} / {importedPackage.package.kind}
              </div>
            </div>
            <Badge variant={getStatusVariant(report.status)}>
              {report.status}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {importedPackage.permissions.length > 0 ? (
              importedPackage.permissions.map((permission) => (
                <span
                  key={permission}
                  className="rounded-sm bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {pluginPermissionLabels[permission]}
                </span>
              ))
            ) : (
              <span className="rounded-sm bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                No permissions
              </span>
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-1">
        {filters.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? "secondary" : "ghost"}
            className="h-7 px-2 text-[11px]"
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-5 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-3" />
          Import
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={exportCsv}
        >
          <Download className="size-3" />
          CSV
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={exportMarkdown}
        >
          MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          onClick={exportBundle}
        >
          <FileJson2 className="size-3" />
          JSON
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={!report.filename}
          onClick={resetImport}
        >
          <RotateCcw className="size-3" />
          Reset
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.slice(0, 5).map((row) => (
          <PackageImportRow key={row.id} row={row} />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No package import rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 5 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 5} more package import rows
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PackageImportRow({ row }: { row: PluginPackageImportRow }) {
  return (
    <div
      className={cn(
        "rounded-sm border border-border/70 bg-muted/20 p-2 text-xs",
        row.status === "blocked" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        row.status === "review" && "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{row.label}</div>
          <div className="mt-1 truncate text-[11px] opacity-80">
            {row.category} / {row.metric}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
            {row.detail}
          </div>
        </div>
        <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
      </div>
    </div>
  );
}

function getVisibleRows(
  rows: PluginPackageImportRow[],
  filter: PluginPackageImportFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter(
    (row) => row.status === filter || row.category === filter,
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/40 p-1.5">
      <div>{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: PluginPackageImportStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
