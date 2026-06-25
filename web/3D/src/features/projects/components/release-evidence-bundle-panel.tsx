import { Archive, Download, FileCheck2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReleaseEvidenceBundleSummary } from "@/features/projects/release-evidence-bundle";

function riskVariant(riskLevel: ReleaseEvidenceBundleSummary["riskLevel"]) {
  if (riskLevel === "critical") {
    return "destructive" as const;
  }

  if (riskLevel === "watch") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function formatByteSize(value: number) {
  if (value <= 0) {
    return "Calculated on export";
  }

  return value < 1024 ? `${value} B` : `${Math.round(value / 1024)} KB`;
}

export function ReleaseEvidenceBundlePanel({
  downloadHref,
  summary,
}: {
  downloadHref: string;
  summary: ReleaseEvidenceBundleSummary;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Archive className="size-4" />
              Release evidence bundle
            </CardTitle>
            <CardDescription>Downloadable launch packet with risk, compliance, audit, public health, runbook, signing, and CAD evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={riskVariant(summary.riskLevel)}>
              <ShieldAlert className="size-3.5" />
              {summary.riskScore}/100 {summary.riskLevel}
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm" })} href={downloadHref}>
              <Download className="size-4" />
              Bundle JSON
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs text-muted-foreground">Projects</p>
          <p className="mt-2 text-xl font-semibold">{summary.projectCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">{summary.complianceReportCount} compliance reports</p>
        </div>
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs text-muted-foreground">Audit</p>
          <p className="mt-2 text-xl font-semibold">{summary.auditEventCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">events packaged</p>
        </div>
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs text-muted-foreground">Public health</p>
          <p className="mt-2 text-xl font-semibold">{summary.publicSurfaceSnapshotCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">snapshots</p>
        </div>
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs text-muted-foreground">Runbook</p>
          <p className="mt-2 text-xl font-semibold">{summary.runbookRecordCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">records</p>
        </div>
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs text-muted-foreground">Signing and CAD</p>
          <p className="mt-2 text-xl font-semibold">{summary.certificateRecordCount + summary.cadJobCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">{summary.releaseBlockerCount} blockers</p>
        </div>
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs text-muted-foreground">Bundle files</p>
          <p className="mt-2 flex items-center gap-2 text-xl font-semibold">
            <FileCheck2 className="size-4" />
            {summary.fileCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{formatByteSize(summary.totalByteSize)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
