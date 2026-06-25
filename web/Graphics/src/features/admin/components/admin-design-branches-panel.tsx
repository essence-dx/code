"use client";

import { GitBranch, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAdminDesignBranchCsv,
  getAdminDesignBranchJson,
  getAdminDesignBranchMarkdown,
  type AdminDesignBranchReport,
  type AdminDesignBranchRow,
  type AdminDesignBranchStatus,
} from "@/features/admin/admin-design-branches";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminDesignBranchesPanelProps = {
  report: AdminDesignBranchReport;
};

export function AdminDesignBranchesPanel({
  report,
}: AdminDesignBranchesPanelProps) {
  function exportJson() {
    downloadTextFile({
      filename: "design-branch-governance.json",
      content: getAdminDesignBranchJson(report),
      type: "application/json",
    });
  }

  function exportCsv() {
    downloadTextFile({
      filename: "design-branch-governance.csv",
      content: getAdminDesignBranchCsv(report),
      type: "text/csv",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      filename: "design-branch-governance.md",
      content: getAdminDesignBranchMarkdown(report),
      type: "text/markdown",
    });
  }

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardDescription>Multiplayer and branching</CardDescription>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="size-5" />
            Design branch governance
          </CardTitle>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={exportJson}>
            <Download className="size-4" />
            JSON
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            CSV
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={exportMarkdown}
          >
            <Download className="size-4" />
            Markdown
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <BranchMetric label="Score" value={report.score} />
          <BranchMetric label="Branches" value={report.branchCount} />
          <BranchMetric label="Active" value={report.activeBranchCount} />
          <BranchMetric label="Review intent" value={report.reviewIntentCount} />
          <BranchMetric label="Restore gaps" value={report.missingRestorePointCount} />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {report.rows.slice(0, 8).map((row) => (
            <BranchReviewCard key={row.id} row={row} />
          ))}
        </div>
        {report.commands.length > 0 ? (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <div className="mb-2 font-medium">Operator checklist</div>
            <ul className="space-y-1 text-muted-foreground">
              {report.commands.map((command) => (
                <li key={command}>{command}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BranchMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold">{value}</div>
    </div>
  );
}

function BranchReviewCard({ row }: { row: AdminDesignBranchRow }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{row.branchName}</div>
          <div className="text-xs text-muted-foreground">
            {row.fileName} by {row.ownerEmail}
          </div>
        </div>
        <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
      </div>
      <div className="mt-3 text-sm">{row.summary}</div>
      <div className="mt-1 text-xs text-muted-foreground">{row.detail}</div>
      <div className="mt-3 rounded-md bg-muted/50 p-2 text-xs">
        {row.recommendation}
      </div>
    </div>
  );
}

function getStatusVariant(status: AdminDesignBranchStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  if (status === "review") {
    return "secondary";
  }

  return "default";
}
