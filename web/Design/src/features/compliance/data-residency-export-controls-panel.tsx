"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Database,
  Download,
  FileArchive,
  Globe2,
  ShieldAlert,
} from "lucide-react";
import type { ReactNode } from "react";

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
  DataResidencyExportControlsCenter,
  DataResidencyStatus,
  ExportControlReport,
  RegionPolicyPreview,
  RestrictedAssetCheck,
} from "@/features/compliance/data-residency-export-controls";
import { cn } from "@/lib/utils";

type DataResidencyExportControlsPanelProps = {
  center: DataResidencyExportControlsCenter;
};

const statusLabels: Record<DataResidencyStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  DataResidencyStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function DataResidencyExportControlsPanel({
  center,
}: DataResidencyExportControlsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data residency and export controls
            </CardTitle>
            <CardDescription>
              Region policy previews, restricted asset checks, export controls,
              and compliance evidence packets.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.policy.allowedRegions.join(", ")}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-7">
          <Metric label="Regions" value={center.totals.allowedRegions} />
          <Metric label="Previews" value={center.totals.regionPreviews} />
          <Metric label="Assets" value={center.totals.restrictedAssets} />
          <Metric label="Exports" value={center.totals.exportReports} />
          <Metric label="Blocked" value={center.totals.blockedControls} />
          <Metric label="Review" value={center.totals.reviewControls} />
          <Metric label="Audit" value={center.totals.auditEvents} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <PanelBlock
              title="Region policy previews"
              badge={`${center.regionPolicyPreviews.length} previews`}
            >
              {center.regionPolicyPreviews.length ? (
                center.regionPolicyPreviews.map((preview) => (
                  <RegionPreviewCard key={preview.id} preview={preview} />
                ))
              ) : (
                <EmptyState text="No completed exports or custom domains need region preview." />
              )}
            </PanelBlock>
            <PanelBlock
              title="Restricted asset checks"
              badge={`${center.restrictedAssetChecks.length} assets`}
            >
              {center.restrictedAssetChecks.length ? (
                center.restrictedAssetChecks.map((check) => (
                  <RestrictedAssetCard key={check.id} check={check} />
                ))
              ) : (
                <EmptyState text="No restricted or incomplete asset evidence found." />
              )}
            </PanelBlock>
          </section>
          <section className="space-y-4">
            <PanelBlock
              title="Export control reports"
              badge={`${center.exportControlReports.length} reports`}
            >
              {center.exportControlReports.length ? (
                center.exportControlReports.map((report) => (
                  <ExportReportCard key={report.id} report={report} />
                ))
              ) : (
                <EmptyState text="No completed export artifacts need export control review." />
              )}
            </PanelBlock>
            <EvidencePacket center={center} />
          </section>
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              Next compliance actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p
                  key={action}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{action}</span>
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RegionPreviewCard({ preview }: { preview: RegionPolicyPreview }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-muted-foreground" />
            <p className="truncate text-sm font-medium">{preview.label}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {preview.scope} / {preview.detectedRegion}
          </p>
        </div>
        <Badge variant={statusVariants[preview.status]}>
          {statusLabels[preview.status]}
        </Badge>
      </div>
      <div className="mt-2 grid gap-1">
        {preview.evidence.slice(0, 2).map((item) => (
          <p key={item} className="text-xs text-muted-foreground">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function RestrictedAssetCard({ check }: { check: RestrictedAssetCheck }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={check.status} />
            <p className="truncate text-sm font-medium">{check.assetName}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Source region: {check.sourceRegion}
          </p>
        </div>
        <Badge variant={statusVariants[check.status]}>
          {check.exportSafe ? "Export safe" : statusLabels[check.status]}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {check.restrictions.slice(0, 4).map((restriction) => (
          <Badge key={restriction} variant="outline">
            {restriction}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function ExportReportCard({ report }: { report: ExportControlReport }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileArchive className="h-4 w-4 text-muted-foreground" />
            <p className="truncate text-sm font-medium">
              {report.projectName} {report.format.toUpperCase()}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {report.region} / {report.storedArtifact ? "stored" : "not stored"}{" "}
            artifact
          </p>
        </div>
        <Badge variant={statusVariants[report.status]}>
          {statusLabels[report.status]}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Metric label="Restricted assets" value={report.restrictedAssetCount} compact />
        <Metric label="Evidence" value={report.evidence.length} compact />
      </div>
    </div>
  );
}

function EvidencePacket({
  center,
}: {
  center: DataResidencyExportControlsCenter;
}) {
  return (
    <PanelBlock
      title="Compliance evidence packet"
      badge={statusLabels[center.complianceEvidencePacket.status]}
    >
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <p className="truncate text-sm font-medium">
                Residency and export evidence
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {center.complianceEvidencePacket.regionPreviewIds.length} region
              previews /{" "}
              {center.complianceEvidencePacket.exportReportIds.length} export
              reports.
            </p>
          </div>
          <Badge
            variant={statusVariants[center.complianceEvidencePacket.status]}
          >
            {statusLabels[center.complianceEvidencePacket.status]}
          </Badge>
        </div>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <a
            href={center.complianceEvidencePacket.download.href}
            download={center.complianceEvidencePacket.download.fileName}
          >
            <Download className="h-4 w-4" />
            Packet
          </a>
        </Button>
      </div>
    </PanelBlock>
  );
}

function PanelBlock({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {badge ? <Badge variant="outline">{badge}</Badge> : null}
      </div>
      <div className="mt-3 grid gap-2">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-semibold", compact ? "text-sm" : "text-lg")}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: DataResidencyStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <ShieldAlert className={className} />;

  return <CircleAlert className={className} />;
}
