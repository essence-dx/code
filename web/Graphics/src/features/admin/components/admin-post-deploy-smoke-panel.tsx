"use client";

import { ClipboardCopy, Download, FileJson2, Route } from "lucide-react";
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
  getProductionDeploySmokeCsv,
  getProductionDeploySmokeJson,
  getProductionDeploySmokeMarkdown,
  type ProductionDeploySmokeReport,
  type ProductionDeploySmokeStatus,
} from "@/features/editor/production-deploy-smoke";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminPostDeploySmokePanelProps = {
  report: ProductionDeploySmokeReport;
};

export function AdminPostDeploySmokePanel({
  report,
}: AdminPostDeploySmokePanelProps) {
  const reviewRows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"));

  function exportJson() {
    downloadTextFile({
      content: getProductionDeploySmokeJson(report),
      filename: "production-deploy-smoke.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getProductionDeploySmokeCsv(report),
      filename: "production-deploy-smoke.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getProductionDeploySmokeMarkdown(report),
      filename: "production-deploy-smoke.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(getProductionDeploySmokeMarkdown(report));
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Route className="size-4" />
            Post-deploy smoke handoff
          </CardTitle>
          <CardDescription>
            Targeted auth, editor, admin, share, prototype, and release routes
            for a deployed Vercel URL.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          Run these checks after deployment against{" "}
          <span className="font-mono text-foreground">{report.baseUrl}</span>.
          They use deployed routes and generated artifacts, not a local
          production build.
        </div>

        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Routes" value={report.routeCount} />
          <Metric label="Required" value={report.requiredRouteCount} />
          <Metric label="Ready" value={report.readyCount} />
          <Metric label="Review" value={report.reviewCount} />
          <Metric label="Blocked" value={report.blockedCount} />
          <Metric label="Hotspots" value={report.prototypeHotspotCount} />
        </div>

        <div className="grid gap-2 text-xs lg:grid-cols-2">
          {reviewRows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{row.label}</span>
                <Badge variant={getStatusVariant(row.status)}>
                  {row.status}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant="outline">{row.kind}</Badge>
                <Badge variant="outline">{row.method}</Badge>
                {row.required ? <Badge variant="outline">required</Badge> : null}
              </div>
              <div className="mt-2 truncate font-mono text-[10px] text-muted-foreground">
                {row.route}
              </div>
              <p className="mt-2 line-clamp-2 text-muted-foreground">
                Wait for {row.waitFor}. {row.evidence}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
          <div className="font-medium">No-build command handoff</div>
          <div className="mt-2 grid gap-1 font-mono text-[11px] text-muted-foreground">
            <span>
              bun run ops:post-deploy-smoke -- --base-url {report.baseUrl}{" "}
              --share-token {report.shareToken}
            </span>
            {report.commands.map((command) => (
              <span key={command}>{command}</span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Button type="button" size="sm" variant="outline" onClick={exportJson}>
            <FileJson2 className="size-3.5" />
            JSON
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
            <Download className="size-3.5" />
            CSV
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={exportMarkdown}
          >
            <Download className="size-3.5" />
            MD
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={copyMarkdown}
          >
            <ClipboardCopy className="size-3.5" />
            Copy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: ProductionDeploySmokeStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
