"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clapperboard,
  Download,
  ExternalLink,
  Layers2,
  PackageCheck,
  Video,
  Volume2,
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
  MediaBrandDeliveryKit,
  MediaBrandDeliveryKitCenter,
  MediaBrandDeliveryKitStatus,
  MediaBrandDeliveryManifestItem,
} from "@/features/media-delivery/media-brand-delivery-kits";
import { cn } from "@/lib/utils";

type MediaBrandDeliveryKitsPanelProps = {
  center: MediaBrandDeliveryKitCenter;
};

const statusLabels: Record<MediaBrandDeliveryKitStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  MediaBrandDeliveryKitStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function MediaBrandDeliveryKitsPanel({
  center,
}: MediaBrandDeliveryKitsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clapperboard className="h-5 w-5" />
              Media brand delivery kits
            </CardTitle>
            <CardDescription>
              Lower-thirds, bumper and outro presets, loudness checks, timeline
              QA, and export-ready packets for video delivery.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Projects" value={center.totals.projects} />
          <Metric
            label="Lower thirds"
            value={center.totals.lowerThirdPresets}
          />
          <Metric label="Bumpers" value={center.totals.bumperOutroPresets} />
          <Metric label="Loudness" value={center.totals.audioLoudnessChecks} />
          <Metric label="Timeline QA" value={center.totals.timelineQaReports} />
          <Metric label="Packets" value={center.totals.deliveryPackets} />
        </div>

        {center.kits.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {center.kits.map((kit) => (
              <MediaKitCard key={kit.id} kit={kit} />
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Add video or audio clips to a project and export a media sequence to
            prepare the first delivery kit.
          </p>
        )}

        <section className="rounded-md border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            Next media actions
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
      </CardContent>
    </Card>
  );
}

function MediaKitCard({ kit }: { kit: MediaBrandDeliveryKit }) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={kit.status} />
            <h3 className="truncate text-sm font-semibold">
              {kit.projectName}
            </h3>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {kit.nextAction}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariants[kit.status]}>{kit.score}/100</Badge>
          <Button asChild size="icon" variant="ghost" aria-label="Open project">
            <a href={`/editor/${kit.projectId}`}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <Signal
          icon={<Layers2 className="h-4 w-4" />}
          label="Lower thirds"
          value={`${kit.lowerThirdPresets.length} presets`}
          detail={kit.lowerThirdPresets
            .map((preset) => preset.label)
            .join(", ")}
        />
        <Signal
          icon={<Video className="h-4 w-4" />}
          label="Bumper / outro"
          value={`${kit.bumperOutroPresets.length} presets`}
          detail={kit.bumperOutroPresets
            .map((preset) => `${preset.label} ${preset.durationSeconds}s`)
            .join(", ")}
        />
        <Signal
          icon={<Volume2 className="h-4 w-4" />}
          label="Loudness"
          value={
            kit.audioLoudness.estimatedLufs === null
              ? "No audio"
              : `${kit.audioLoudness.estimatedLufs} LUFS`
          }
          detail={kit.audioLoudness.detail}
          variant={statusVariants[kit.audioLoudness.status]}
        />
        <Signal
          icon={<PackageCheck className="h-4 w-4" />}
          label="Export"
          value={
            kit.exportSummary.latestFormatLabel ?? kit.exportSummary.status
          }
          detail={
            kit.exportSummary.latestArtifactName ??
            `${kit.exportSummary.completedCount} completed, ${kit.exportSummary.failedCount} failed`
          }
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          <SectionHeader>Timeline QA</SectionHeader>
          {kit.timelineQa.checks.slice(0, 4).map((check) => (
            <div
              key={check.id}
              className="rounded-md border border-border bg-background p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium">{check.label}</p>
                <Badge variant={statusVariants[check.status]}>
                  {statusLabels[check.status]}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {check.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <SectionHeader>Delivery manifest</SectionHeader>
          {kit.deliveryPacket.manifest.slice(0, 4).map((item) => (
            <ManifestRow key={item.id} item={item} />
          ))}
        </div>
      </div>

      <Button asChild size="sm" variant="outline" className="mt-3">
        <a
          href={kit.deliveryPacket.downloadJson}
          download={`${kit.projectId}-media-delivery-kit.json`}
        >
          <Download className="h-3.5 w-3.5" />
          Media packet
        </a>
      </Button>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Signal({
  icon,
  label,
  value,
  detail,
  variant = "outline",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
  variant?: "secondary" | "outline" | "destructive";
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
        <Badge variant={variant}>{value}</Badge>
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function ManifestRow({ item }: { item: MediaBrandDeliveryManifestItem }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium">{item.label}</p>
        <Badge
          variant={item.kind === "blocker" ? "destructive" : "outline"}
          className="capitalize"
        >
          {item.kind}
        </Badge>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {item.detail}
      </p>
    </div>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
      {children}
    </p>
  );
}

function StatusIcon({ status }: { status: MediaBrandDeliveryKitStatus }) {
  const className = cn(
    "h-4 w-4",
    status === "ready" && "text-emerald-600",
    status === "review" && "text-amber-600",
    status === "blocked" && "text-destructive",
  );

  if (status === "ready") return <CheckCircle2 className={className} />;

  return <CircleAlert className={className} />;
}
