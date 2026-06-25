import {
  ClipboardCopy,
  Code2,
  Download,
  ExternalLink,
  FileJson2,
  RadioTower,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AdminPublicLinkObservabilityReport,
  AdminPublicLinkStatus,
} from "@/features/admin/admin-public-link-observability";
import {
  getAdminPublicLinkObservabilityCsv,
  getAdminPublicLinkObservabilityJson,
  getAdminPublicLinkObservabilityMarkdown,
} from "@/features/admin/admin-public-link-observability-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminPublicLinkObservabilityPanelProps = {
  report: AdminPublicLinkObservabilityReport;
};

export function AdminPublicLinkObservabilityPanel({
  report,
}: AdminPublicLinkObservabilityPanelProps) {
  function exportJson() {
    downloadTextFile({
      filename: "public-link-observability.json",
      content: getAdminPublicLinkObservabilityJson(report),
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      filename: "public-link-observability.csv",
      content: getAdminPublicLinkObservabilityCsv(report),
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      filename: "public-link-observability.md",
      content: getAdminPublicLinkObservabilityMarkdown(report),
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminPublicLinkObservabilityMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <RadioTower className="size-4" />
            Public link observability
          </CardTitle>
          <CardDescription>
            Share, prototype, and embed targets with route smoke, exposure,
            expiry, referrer notes, and release-safe publication queues.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
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
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Shares" value={report.activeShareCount} />
          <Metric label="Surfaces" value={report.surfaceCount} />
          <Metric label="Embeds" value={report.embedSurfaceCount} />
          <Metric label="Stale" value={report.staleLinkCount} />
          <Metric label="Exposure" value={report.downloadExposureCount} />
          <Metric label="Release-safe" value={report.releaseSafeCount} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-3">
            {report.surfaces.slice(0, 8).map((surface) => (
              <div
                key={surface.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      {surface.kind === "embed" ? (
                        <Code2 className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{surface.label}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="outline">{surface.kind}</Badge>
                      <Badge variant={getStatusVariant(surface.status)}>
                        {surface.status}
                      </Badge>
                      <Badge variant={getStatusVariant(surface.smokeStatus)}>
                        smoke {surface.smokeStatus}
                      </Badge>
                      <Badge variant={surface.releaseSafe ? "outline" : "secondary"}>
                        <ShieldCheck className="size-3" />
                        {surface.releaseSafe ? "release-safe" : "review"}
                      </Badge>
                    </div>
                  </div>
                  <Button asChild type="button" size="sm" variant="ghost">
                    <a href={surface.routePath} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </Button>
                </div>
                <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
                  <Info label="Expiry" value={surface.expiryState} />
                  <Info
                    label="Exposure"
                    value={[
                      surface.allowDownload ? "download" : "",
                      surface.allowComments ? "comments" : "",
                    ].filter(Boolean).join(", ") || "none"}
                  />
                  <Info
                    label="Referrer"
                    value={surface.referrerNote ?? "missing"}
                  />
                </div>
                <div className="mt-3 truncate font-mono text-[11px] text-muted-foreground">
                  {surface.targetUrl}
                </div>
              </div>
            ))}
          </div>

          <div className="grid content-start gap-3">
            {report.rows.slice(0, 8).map((row) => (
              <div
                key={row.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate text-sm font-medium">
                    {row.label}
                  </div>
                  <Badge variant={getStatusVariant(row.status)}>
                    {row.status}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline">{row.category}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{row.detail}</p>
                <p className="mt-2 text-xs">{row.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function getStatusVariant(status: AdminPublicLinkStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
