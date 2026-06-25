"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Download,
  ExternalLink,
  ListChecks,
  PackageCheck,
  Ruler,
  Tags,
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
  VendorProductionHandoff,
  VendorProductionHandoffCenter,
  VendorProductionHandoffStatus,
  VendorProductionManifestItem,
} from "@/features/print-production/vendor-production-handoff";
import { cn } from "@/lib/utils";

type VendorProductionHandoffPanelProps = {
  center: VendorProductionHandoffCenter;
};

const statusLabels: Record<VendorProductionHandoffStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  VendorProductionHandoffStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function VendorProductionHandoffPanel({
  center,
}: VendorProductionHandoffPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5" />
              Vendor production handoff
            </CardTitle>
            <CardDescription>
              Dielines, proof sheets, finishing notes, SKU metadata, and
              vendor-ready delivery packets for print projects.
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
          <Metric label="Dielines" value={center.totals.dielineSpecs} />
          <Metric label="Proofs" value={center.totals.proofSheets} />
          <Metric label="SKUs" value={center.totals.skuPackages} />
          <Metric label="Packets" value={center.totals.deliveryPackets} />
          <Metric label="Blocked" value={center.totals.blockedHandoffs} />
        </div>

        {center.handoffs.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {center.handoffs.map((handoff) => (
              <VendorHandoffCard key={handoff.id} handoff={handoff} />
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Export a print-ready project to generate the first vendor delivery
            packet.
          </p>
        )}

        <section className="rounded-md border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            Next vendor actions
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

function VendorHandoffCard({ handoff }: { handoff: VendorProductionHandoff }) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={handoff.status} />
            <h3 className="truncate text-sm font-semibold">
              {handoff.projectName}
            </h3>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {handoff.nextAction}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariants[handoff.status]}>
            {handoff.score}/100
          </Badge>
          <Button asChild size="icon" variant="ghost" aria-label="Open project">
            <a href={`/editor/${handoff.projectId}`}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <Signal
          icon={<Ruler className="h-4 w-4" />}
          label="Dieline"
          value={`${handoff.dieline.trimWidthInches}" x ${handoff.dieline.trimHeightInches}"`}
          detail={`${handoff.dieline.productFamily}, ${handoff.dieline.resolutionDpi} DPI, ${handoff.dieline.panelCount} panels`}
        />
        <Signal
          icon={<Tags className="h-4 w-4" />}
          label="SKU"
          value={handoff.skuMetadata.sku}
          detail={`${handoff.skuMetadata.packageCode} / ${handoff.skuMetadata.dimensionsLabel}`}
        />
        <Signal
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Proof"
          value={statusLabels[handoff.proofSheet.status]}
          detail={`${handoff.proofSheet.requiredViews.length} views, ${handoff.proofSheet.printAuditScore ?? "no"} print score`}
          variant={statusVariants[handoff.proofSheet.status]}
        />
        <Signal
          icon={<ListChecks className="h-4 w-4" />}
          label="Packet"
          value={`${handoff.deliveryPacket.manifest.length} manifest items`}
          detail={
            handoff.deliveryPacket.manifest.find(
              (item) => item.kind === "artifact",
            )?.detail ?? "Export artifact pending"
          }
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {handoff.proofSheet.requiredViews.map((view) => (
          <Badge key={view} variant="outline">
            {view}
          </Badge>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          <SectionHeader>Finishing notes</SectionHeader>
          {handoff.finishingNotes.slice(0, 4).map((note) => (
            <div
              key={note.id}
              className="rounded-md border border-border bg-background p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium">{note.label}</p>
                <Badge variant={note.required ? "secondary" : "outline"}>
                  {note.required ? "Required" : "Optional"}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {note.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <SectionHeader>Delivery manifest</SectionHeader>
          {handoff.deliveryPacket.manifest.slice(0, 4).map((item) => (
            <ManifestRow key={item.id} item={item} />
          ))}
        </div>
      </div>

      <Button asChild size="sm" variant="outline" className="mt-3">
        <a
          href={handoff.deliveryPacket.downloadJson}
          download={`${handoff.skuMetadata.vendorFileName}-vendor-packet.json`}
        >
          <Download className="h-3.5 w-3.5" />
          Vendor packet
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

function ManifestRow({ item }: { item: VendorProductionManifestItem }) {
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

function StatusIcon({ status }: { status: VendorProductionHandoffStatus }) {
  const className = cn(
    "h-4 w-4",
    status === "ready" && "text-emerald-600",
    status === "review" && "text-amber-600",
    status === "blocked" && "text-destructive",
  );

  if (status === "ready") return <CheckCircle2 className={className} />;

  return <CircleAlert className={className} />;
}
