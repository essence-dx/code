"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  FileSearch,
  GitBranch,
  ShieldAlert,
  Sparkles,
  Trash2,
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
import { formatAssetBytes } from "@/features/assets/asset-library-audit";
import type {
  CreativeAssetBatchCleanupPreview,
  CreativeAssetDependencyImpactSimulation,
  CreativeAssetIntelligenceCenter,
  CreativeAssetIntelligenceStatus,
  CreativeAssetRecommendation,
} from "@/features/assets/creative-asset-intelligence";
import { cn } from "@/lib/utils";

type CreativeAssetIntelligencePanelProps = {
  center: CreativeAssetIntelligenceCenter;
};

const statusLabels: Record<CreativeAssetIntelligenceStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  CreativeAssetIntelligenceStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function CreativeAssetIntelligencePanel({
  center,
}: CreativeAssetIntelligencePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Creative asset intelligence
            </CardTitle>
            <CardDescription>
              Duplicate cleanup, license remediation, usage recommendations,
              dependency impact simulations, and export-safe remediation
              packets.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                href={center.remediationPacket.dataUrl}
                download={center.remediationPacket.fileName}
              >
                <Download className="h-4 w-4" />
                Packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Assets" value={center.totals.assets} />
          <Metric label="Duplicates" value={center.totals.duplicateGroups} />
          <Metric label="Cleanup" value={center.totals.cleanupCandidates} />
          <Metric
            label="Reclaim"
            value={formatAssetBytes(center.totals.reclaimBytes)}
          />
          <Metric label="License gaps" value={center.totals.licenseGaps} />
          <Metric label="Impact risks" value={center.totals.dependencyRisks} />
          <Metric label="Projects" value={center.totals.affectedProjects} />
          <Metric label="Actions" value={center.totals.remediationActions} />
        </div>

        <PanelBlock
          title="Recommendations"
          badge={`${center.recommendations.length} actions`}
        >
          {center.recommendations.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {center.recommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                />
              ))}
            </div>
          ) : (
            <EmptyLine>
              No asset intelligence recommendations are pending.
            </EmptyLine>
          )}
        </PanelBlock>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <PanelBlock
            title="Batch cleanup previews"
            badge={`${center.batchCleanupPreviews.length} previews`}
          >
            {center.batchCleanupPreviews.length ? (
              <ScrollArea className="h-[320px]">
                <div className="flex flex-col gap-2 pr-3">
                  {center.batchCleanupPreviews.map((preview) => (
                    <CleanupPreviewCard key={preview.id} preview={preview} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyLine>No duplicate cleanup previews are needed.</EmptyLine>
            )}
          </PanelBlock>

          <PanelBlock
            title="Dependency simulations"
            badge={`${center.dependencyImpactSimulations.length} simulations`}
          >
            {center.dependencyImpactSimulations.length ? (
              <ScrollArea className="h-[320px]">
                <div className="flex flex-col gap-2 pr-3">
                  {center.dependencyImpactSimulations.map((simulation) => (
                    <DependencySimulationCard
                      key={simulation.id}
                      simulation={simulation}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyLine>No asset dependency impact is indexed yet.</EmptyLine>
            )}
          </PanelBlock>
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Asset remediation actions
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

function RecommendationCard({
  recommendation,
}: {
  recommendation: CreativeAssetRecommendation;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={recommendation.status} />
            <p className="truncate text-sm font-medium">
              {recommendation.title}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {recommendation.detail}
          </p>
        </div>
        <Badge variant={statusVariants[recommendation.status]}>
          P{recommendation.priority}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{recommendation.kind}</Badge>
        <Badge variant="outline">{recommendation.assetIds.length} assets</Badge>
        <Badge variant="outline">
          {recommendation.affectedProjectIds.length} projects
        </Badge>
        {recommendation.reclaimBytes ? (
          <Badge variant="outline">
            {formatAssetBytes(recommendation.reclaimBytes)}
          </Badge>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {recommendation.action}
      </p>
    </div>
  );
}

function CleanupPreviewCard({
  preview,
}: {
  preview: CreativeAssetBatchCleanupPreview;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            <p className="truncate text-sm font-medium">{preview.title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Retain {preview.retainAssetId}; remove{" "}
            {preview.removableAssetIds.length} safe duplicate
            {preview.removableAssetIds.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Badge variant={statusVariants[preview.status]}>
          {statusLabels[preview.status]}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">
          {formatAssetBytes(preview.reclaimBytes)}
        </Badge>
        <Badge variant="outline">
          {preview.blockedAssetIds.length} blocked
        </Badge>
      </div>
      <div className="mt-2 grid gap-1">
        {preview.reasons.slice(0, 3).map((reason) => (
          <p key={reason} className="text-xs text-muted-foreground">
            {reason}
          </p>
        ))}
      </div>
    </div>
  );
}

function DependencySimulationCard({
  simulation,
}: {
  simulation: CreativeAssetDependencyImpactSimulation;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <p className="truncate text-sm font-medium">
              {simulation.assetName}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Risk {simulation.riskScore}/100 across{" "}
            {simulation.affectedProjects.length} project
            {simulation.affectedProjects.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Badge variant={statusVariants[simulation.status]}>
          {statusLabels[simulation.status]}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">
          {simulation.affectedExports.length} exports
        </Badge>
        <Badge variant="outline">
          {simulation.affectedWebsites.length} websites
        </Badge>
        <Badge variant="outline">
          {simulation.affectedTemplates.length} templates
        </Badge>
        <Badge variant="outline">{simulation.skippedReferences} skipped</Badge>
      </div>
      {simulation.warnings.length ? (
        <div className="mt-2 grid gap-1">
          {simulation.warnings.slice(0, 3).map((warning) => (
            <p key={warning} className="text-xs text-muted-foreground">
              {warning}
            </p>
          ))}
        </div>
      ) : null}
      {simulation.affectedProjects[0] ? (
        <Button asChild size="sm" variant="ghost" className="mt-2 px-0">
          <a href={simulation.affectedProjects[0].href}>
            Open project
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function PanelBlock({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="outline">{badge}</Badge>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileSearch className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function StatusIcon({ status }: { status: CreativeAssetIntelligenceStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}
