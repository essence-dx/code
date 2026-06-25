import Link from "next/link";
import type { ReactNode } from "react";
import { Archive, Cpu, Download, FileArchive, KeyRound, PackageCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OfflineDesktopHandoffKitSummary } from "@/features/projects/offline-desktop-handoff-kit";

function scoreVariant(score: number) {
  if (score < 60) {
    return "destructive" as const;
  }

  return score < 86 ? "secondary" : "outline";
}

function formatByteSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  return `${Math.round(value / 1024)} KB`;
}

export function OfflineDesktopHandoffKitPanel({
  downloadHref,
  summary,
}: {
  downloadHref: string;
  summary: OfflineDesktopHandoffKitSummary;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Archive className="size-4" />
              Offline desktop handoff
            </CardTitle>
            <CardDescription>Downloadable kit for Tauri updater manifests, signing checklist, app package readiness, CAD outputs, and release metadata.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={scoreVariant(summary.handoffScore)}>
              <ShieldAlert className="size-3.5" />
              {summary.handoffScore}/100
            </Badge>
            <Badge className="rounded-md" variant={summary.releaseBlockerCount > 0 ? "destructive" : "outline"}>
              {summary.releaseBlockerCount} blockers
            </Badge>
            <Link className={buttonVariants({ className: "h-8 gap-2", size: "sm" })} href={downloadHref}>
              <Download className="size-4" />
              Download kit
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile icon={<FileArchive className="size-4" />} label="Kit files" value={summary.fileCount ? String(summary.fileCount) : "preview"} detail={summary.totalByteSize ? formatByteSize(summary.totalByteSize) : "Generated on export"} />
          <SummaryTile icon={<PackageCheck className="size-4" />} label="Desktop artifacts" value={String(summary.selectedDesktopArtifactCount)} detail={`${summary.unsignedDesktopArtifactCount} unsigned`} />
          <SummaryTile icon={<KeyRound className="size-4" />} label="Signing" value={`${summary.signingReadyPlatformCount}/3`} detail={`${summary.signingMissingSecretCount} missing secrets`} />
          <SummaryTile icon={<PackageCheck className="size-4" />} label="App packages" value={String(summary.appPackageBlockedCount)} detail="blocked package certificates" />
          <SummaryTile icon={<Cpu className="size-4" />} label="CAD outputs" value={String(summary.cadUnresolvedCount)} detail="open worker records" />
        </div>
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs text-muted-foreground">Kit hash</p>
          <p className="mt-1 truncate font-mono text-xs">{summary.contentHash || "Created when the kit is exported"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryTile({ detail, icon, label, value }: { detail: string; icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-xl font-semibold">{value}</p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{icon}</span>
      </div>
      <p className="mt-2 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
