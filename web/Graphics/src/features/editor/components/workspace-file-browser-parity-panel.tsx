"use client";

import {
  ClipboardCopy,
  Download,
  FileJson2,
  FolderKanban,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ReadinessMetric,
  downloadTextFile,
} from "@/features/editor/components/library-release-panel-shared";
import {
  getWorkspaceFileBrowserParityCsv,
  getWorkspaceFileBrowserParityJson,
  getWorkspaceFileBrowserParityMarkdown,
  type WorkspaceFileBrowserParityReport,
  type WorkspaceFileBrowserParityStatus,
} from "@/features/editor/workspace-file-browser-parity";

type WorkspaceFileBrowserParityPanelProps = {
  report: WorkspaceFileBrowserParityReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function WorkspaceFileBrowserParityPanel({
  report,
  onRecordActivity,
}: WorkspaceFileBrowserParityPanelProps) {
  const reviewRows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"))
    .slice(0, 5);

  function exportJson() {
    downloadTextFile({
      content: getWorkspaceFileBrowserParityJson(report),
      filename: "workspace-file-browser-parity.json",
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported workspace file browser parity JSON",
      `${report.status} score ${report.score}`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getWorkspaceFileBrowserParityCsv(report),
      filename: "workspace-file-browser-parity.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported workspace file browser parity CSV",
      `${report.rows.length} review rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getWorkspaceFileBrowserParityMarkdown(report),
      filename: "workspace-file-browser-parity.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported workspace file browser parity handoff",
      `${report.ownerTransferQueueCount} owner transfer queue item(s)`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getWorkspaceFileBrowserParityMarkdown(report),
    );
    onRecordActivity?.(
      "Copied workspace file browser parity handoff",
      `${report.creationImportHandoffCount} creation/import signal(s)`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FolderKanban className="size-3.5" />
            Workspace file parity
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Teams, projects, drafts, recents, transfer review, and handoff.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ReadinessMetric label="Teams" value={report.teamScopeCount} />
        <ReadinessMetric label="Projects" value={report.projectScopeCount} />
        <ReadinessMetric label="Drafts" value={report.draftQueueCount} />
        <ReadinessMetric
          label="Transfer"
          value={report.ownerTransferQueueCount}
        />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          onClick={exportJson}
        >
          <FileJson2 className="size-3" />
          JSON
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
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
          onClick={exportMarkdown}
        >
          <Download className="size-3" />
          MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          onClick={copyMarkdown}
        >
          <ClipboardCopy className="size-3" />
          Copy
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {reviewRows.map((row) => (
          <div key={row.id} className="rounded-sm bg-muted px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-medium">
                {row.label}
              </span>
              <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
            </div>
            <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
              {row.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getStatusVariant(status: WorkspaceFileBrowserParityStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
