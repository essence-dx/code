"use client";

import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileWarning,
  ImageUp,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Wand2,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  AdvancedBatchAssetOperationCenter,
  AdvancedBatchAssetOperationStatus,
  AssetAltTextQueueItem,
  AssetLicenseMetadataQueueItem,
  AssetUsageImpactPreview,
  BatchAssetTransformPlan,
  ReversibleAssetCleanupPacket,
} from "@/features/assets/advanced-batch-asset-operations";
import { formatAssetBytes } from "@/features/assets/asset-library-audit";
import { cn } from "@/lib/utils";

type AdvancedBatchAssetOperationsPanelProps = {
  center: AdvancedBatchAssetOperationCenter;
};

const statusLabels: Record<AdvancedBatchAssetOperationStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  AdvancedBatchAssetOperationStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function AdvancedBatchAssetOperationsPanel({
  center,
}: AdvancedBatchAssetOperationsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Advanced batch asset operations
            </CardTitle>
            <CardDescription>
              Bulk transforms, metadata queues, project impact previews, and
              reversible cleanup packets.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Assets" value={center.totals.assets} />
          <Metric
            label="Transform candidates"
            value={center.totals.transformCandidates}
          />
          <Metric
            label="Metadata queue"
            value={center.totals.metadataQueueItems}
          />
          <Metric label="Usage previews" value={center.totals.usagePreviews} />
          <Metric label="Cleanup packets" value={center.totals.cleanupPackets} />
          <Metric
            label="Potential savings"
            value={formatAssetBytes(center.totals.estimatedReclaimBytes)}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <PanelBlock
            title="Bulk transform plans"
            icon={<ImageUp className="h-4 w-4 text-muted-foreground" />}
            badge={`${center.transformPlans.length} plans`}
          >
            {center.transformPlans.length ? (
              <div className="grid gap-2">
                {center.transformPlans.map((plan) => (
                  <TransformPlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            ) : (
              <EmptyLine>No bulk transforms are pending.</EmptyLine>
            )}
          </PanelBlock>

          <PanelBlock
            title="Reversible cleanup"
            icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />}
            badge={`${center.reversibleCleanupPackets.length} packets`}
          >
            {center.reversibleCleanupPackets.length ? (
              <div className="grid gap-2">
                {center.reversibleCleanupPackets.map((packet) => (
                  <CleanupPacketCard key={packet.id} packet={packet} />
                ))}
              </div>
            ) : (
              <EmptyLine>No duplicate cleanup packets are pending.</EmptyLine>
            )}
          </PanelBlock>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <QueuePanel
            title="Alt text queue"
            emptyState="No alt text metadata is pending."
            items={center.altTextQueue}
            renderItem={(item) => <AltTextRow item={item} />}
          />
          <QueuePanel
            title="License metadata queue"
            emptyState="No license metadata is pending."
            items={center.licenseMetadataQueue}
            renderItem={(item) => <LicenseRow item={item} />}
          />
          <QueuePanel
            title="Usage impact previews"
            emptyState="No project impact previews are pending."
            items={center.usageImpactPreviews}
            renderItem={(item) => <UsagePreviewRow preview={item} />}
          />
        </div>

        {center.nextActions.length ? (
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Next asset batch actions
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
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TransformPlanCard({ plan }: { plan: BatchAssetTransformPlan }) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ReadinessIcon status={plan.status} />
            <h3 className="text-sm font-semibold">{plan.label}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.operationCount} operations into {plan.outputFormat}.
          </p>
        </div>
        <Badge variant={statusVariants[plan.status]}>{plan.kind}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{plan.assetIds.length} assets</Badge>
        <Badge variant="outline">
          {plan.targetProjectIds.length} projects
        </Badge>
        <Badge variant="outline">
          {formatAssetBytes(plan.estimatedReclaimBytes)} savings
        </Badge>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {plan.instructions[0]}
      </p>
    </article>
  );
}

function CleanupPacketCard({
  packet,
}: {
  packet: ReversibleAssetCleanupPacket;
}) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ReadinessIcon status={packet.status} />
            <h3 className="text-sm font-semibold">Duplicate cleanup packet</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Retain {packet.retainAssetId}; remove{" "}
            {packet.removeAssetIds.length} duplicate assets.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <a href={packet.dataUrl} download={`${packet.id}.json`}>
            <Download className="h-4 w-4" />
            Packet
          </a>
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">
          {formatAssetBytes(packet.reclaimBytes)}
        </Badge>
        <Badge variant="outline">{packet.rollbackSteps.length} rollback</Badge>
        <Badge variant="outline">
          {packet.affectedProjectIds.length} published projects
        </Badge>
      </div>
    </article>
  );
}

function QueuePanel<T>({
  title,
  emptyState,
  items,
  renderItem,
}: {
  title: string;
  emptyState: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <div className="rounded-md border border-border">
      <div className="border-b border-border p-4">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {items.length ? (
        <ScrollArea className="h-[310px]">
          <div className="divide-y divide-border">
            {items.slice(0, 12).map((item, index) => (
              <div key={index}>{renderItem(item)}</div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">{emptyState}</p>
      )}
    </div>
  );
}

function AltTextRow({ item }: { item: AssetAltTextQueueItem }) {
  return (
    <div className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.assetName}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {item.suggestedAltText}
          </p>
        </div>
        <Badge variant={statusVariants[item.status]}>{item.scope}</Badge>
      </div>
    </div>
  );
}

function LicenseRow({ item }: { item: AssetLicenseMetadataQueueItem }) {
  return (
    <div className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.assetName}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
        </div>
        <Badge variant={statusVariants[item.status]}>
          {item.missingFields.length}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.missingFields.map((field) => (
          <Badge key={field} variant="outline">
            {field}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function UsagePreviewRow({ preview }: { preview: AssetUsageImpactPreview }) {
  return (
    <div className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{preview.projectName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {preview.referenceCount} references,{" "}
            {preview.skippedReferenceCount} skipped.
          </p>
        </div>
        <Badge variant={statusVariants[preview.status]}>
          {preview.publicSurface ? "Public" : statusLabels[preview.status]}
        </Badge>
      </div>
      {preview.warnings.length ? (
        <p className="mt-2 flex gap-2 text-xs text-muted-foreground">
          <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{preview.warnings[0]}</span>
        </p>
      ) : null}
    </div>
  );
}

function PanelBlock({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon: ReactNode;
  badge: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        <Badge variant="outline">{badge}</Badge>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function ReadinessIcon({ status }: { status: AdvancedBatchAssetOperationStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <Sparkles className={className} />;

  return <ShieldAlert className={className} />;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
