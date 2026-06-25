"use client";

import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSignature,
  Link2,
  RefreshCcw,
  Replace,
  ShieldAlert,
  ShieldCheck,
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
  AssetBulkRelinkPlan,
  AssetLifecycleGovernanceCenter,
  AssetLifecycleGovernanceStatus,
  AssetLifecycleUsagePreview,
  AssetReplacementPlan,
  AssetRightsRenewal,
} from "@/features/assets/asset-lifecycle-governance";
import { cn } from "@/lib/utils";

type AssetLifecycleGovernancePanelProps = {
  center: AssetLifecycleGovernanceCenter;
};

const statusLabels: Record<AssetLifecycleGovernanceStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  AssetLifecycleGovernanceStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function AssetLifecycleGovernancePanel({
  center,
}: AssetLifecycleGovernancePanelProps) {
  const packet = center.signedEvidencePackets[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Asset lifecycle governance
            </CardTitle>
            <CardDescription>
              Rights-expiry renewals, replacement propagation, bulk relinking,
              usage impact previews, and signed evidence packets.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            {packet ? (
              <Button asChild size="sm" variant="outline">
                <a href={packet.dataUrl} download={packet.fileName}>
                  <Download className="h-4 w-4" />
                  Packet
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Assets" value={center.totals.assets} />
          <Metric label="Renewals" value={center.totals.rightsRenewals} />
          <Metric label="Replacements" value={center.totals.replacementPlans} />
          <Metric label="Relinks" value={center.totals.bulkRelinkPlans} />
          <Metric
            label="Usage previews"
            value={center.totals.usageImpactPreviews}
          />
          <Metric label="Packets" value={center.totals.signedEvidencePackets} />
          <Metric label="Projects" value={center.totals.affectedProjects} />
          <Metric label="Evidence" value={center.totals.auditEvidence} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <PanelBlock
            title="Replacement propagation"
            badge={`${center.replacementPlans.length} plans`}
          >
            {center.replacementPlans.length ? (
              <ScrollArea className="h-[340px]">
                <div className="grid gap-2 pr-3">
                  {center.replacementPlans.map((plan) => (
                    <ReplacementPlanCard key={plan.id} plan={plan} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyLine>No governed asset replacements are pending.</EmptyLine>
            )}
          </PanelBlock>

          <PanelBlock
            title="Rights renewals"
            badge={`${center.rightsRenewals.length} renewals`}
          >
            {center.rightsRenewals.length ? (
              <div className="grid gap-2">
                {center.rightsRenewals.map((renewal) => (
                  <RightsRenewalCard key={renewal.id} renewal={renewal} />
                ))}
              </div>
            ) : (
              <EmptyLine>No asset rights renewals are due.</EmptyLine>
            )}
          </PanelBlock>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <PanelBlock
            title="Bulk relink plans"
            badge={`${center.bulkRelinkPlans.length} plans`}
          >
            {center.bulkRelinkPlans.length ? (
              <div className="grid gap-2">
                {center.bulkRelinkPlans.map((plan) => (
                  <BulkRelinkCard key={plan.id} plan={plan} />
                ))}
              </div>
            ) : (
              <EmptyLine>No bulk relink plan is needed.</EmptyLine>
            )}
          </PanelBlock>

          <PanelBlock
            title="Usage impact previews"
            badge={`${center.usageImpactPreviews.length} previews`}
          >
            {center.usageImpactPreviews.length ? (
              <div className="grid gap-2">
                {center.usageImpactPreviews.map((preview) => (
                  <UsagePreviewCard key={preview.id} preview={preview} />
                ))}
              </div>
            ) : (
              <EmptyLine>No affected project usage is indexed yet.</EmptyLine>
            )}
          </PanelBlock>
        </div>

        {packet ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileSignature className="h-4 w-4 text-muted-foreground" />
                  Signed lifecycle evidence
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {packet.signature} - {packet.auditEvidenceIds.length} audit
                  records - {packet.replacementPlanIds.length} replacement
                  plans.
                </p>
              </div>
              <Badge variant={statusVariants[packet.status]}>
                {statusLabels[packet.status]}
              </Badge>
            </div>
          </section>
        ) : null}

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Lifecycle next actions
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

function RightsRenewalCard({ renewal }: { renewal: AssetRightsRenewal }) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={renewal.status} />
            <h3 className="truncate text-sm font-semibold">
              {renewal.assetName}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {renewal.renewalReason}
          </p>
        </div>
        <Badge variant={statusVariants[renewal.status]}>
          {renewal.reviewDueAt ? formatDate(renewal.reviewDueAt) : "Review"}
        </Badge>
      </div>
      <p className="mt-3 flex gap-2 text-xs text-muted-foreground">
        <RefreshCcw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{renewal.action}</span>
      </p>
    </article>
  );
}

function ReplacementPlanCard({ plan }: { plan: AssetReplacementPlan }) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={plan.status} />
            <h3 className="truncate text-sm font-semibold">
              {plan.sourceAssetName}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.replacementAssetName
              ? `Replace with ${plan.replacementAssetName}.`
              : "No compatible replacement is approved yet."}
          </p>
        </div>
        <Badge variant={statusVariants[plan.status]}>
          {statusLabels[plan.status]}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">
          {plan.affectedProjectIds.length} projects
        </Badge>
        <Badge variant="outline">{plan.propagationSteps.length} steps</Badge>
        <Badge variant="outline">{plan.auditEvidenceIds.length} evidence</Badge>
      </div>
      <div className="mt-3 grid gap-1">
        {plan.propagationSteps.slice(0, 2).map((step) => (
          <p key={step} className="flex gap-2 text-xs text-muted-foreground">
            <Replace className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{step}</span>
          </p>
        ))}
      </div>
    </article>
  );
}

function BulkRelinkCard({ plan }: { plan: AssetBulkRelinkPlan }) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <StatusIcon status={plan.status} />
            <h3 className="text-sm font-semibold">{plan.label}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.operationCount} relink operations across{" "}
            {plan.targetProjectIds.length} project
            {plan.targetProjectIds.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Link2 className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{plan.sourceAssetIds.length} sources</Badge>
        <Badge variant="outline">
          {plan.replacementAssetIds.length} replacements
        </Badge>
      </div>
      {plan.warnings.length ? (
        <p className="mt-3 flex gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{plan.warnings[0]}</span>
        </p>
      ) : null}
    </article>
  );
}

function UsagePreviewCard({
  preview,
}: {
  preview: AssetLifecycleUsagePreview;
}) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={preview.status} />
            <h3 className="truncate text-sm font-semibold">
              {preview.projectName}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {preview.sourceAssetIds.length} governed sources and{" "}
            {preview.relinkPlanIds.length} relink plan
            {preview.relinkPlanIds.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Badge variant={statusVariants[preview.status]}>
          {statusLabels[preview.status]}
        </Badge>
      </div>
      {preview.warnings.length ? (
        <div className="mt-3 grid gap-1">
          {preview.warnings.slice(0, 3).map((warning) => (
            <p
              key={warning}
              className="flex gap-2 text-xs text-muted-foreground"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{warning}</span>
            </p>
          ))}
        </div>
      ) : null}
    </article>
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

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: AssetLifecycleGovernanceStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <RefreshCcw className={className} />;

  return <ShieldAlert className={className} />;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
