"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  FileCheck2,
  History,
  RotateCcw,
  Route,
  ShieldAlert,
  ShieldCheck,
  Store,
  UserCheck,
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
  MarketplaceCreatorLicenseEvidence,
  MarketplaceCreatorModerationPriority,
  MarketplaceCreatorModerationRoute,
  MarketplaceCreatorOperationsCenter,
  MarketplaceCreatorOperationStatus,
  MarketplaceCreatorRollbackPlan,
  MarketplaceCreatorSubmission,
  MarketplaceCreatorTrustScore,
} from "@/features/templates/marketplace-creator-operations";
import { cn } from "@/lib/utils";

type MarketplaceCreatorOperationsPanelProps = {
  center: MarketplaceCreatorOperationsCenter;
};

const statusLabels: Record<MarketplaceCreatorOperationStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  MarketplaceCreatorOperationStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

const priorityVariants: Record<
  MarketplaceCreatorModerationPriority,
  "secondary" | "outline" | "destructive"
> = {
  high: "destructive",
  medium: "outline",
  low: "secondary",
};

export function MarketplaceCreatorOperationsPanel({
  center,
}: MarketplaceCreatorOperationsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Marketplace creator operations
            </CardTitle>
            <CardDescription>
              Versioned submissions, trust scoring, licensing evidence, rollback
              readiness, and moderation routing for creator releases.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric
            label="Submissions"
            value={center.totals.versionedSubmissions}
          />
          <Metric label="Ready" value={center.totals.readySubmissions} />
          <Metric label="Blocked" value={center.totals.blockedSubmissions} />
          <Metric label="Trusted" value={center.totals.trustedCreators} />
          <Metric label="License ready" value={center.totals.licenseReady} />
          <Metric label="Rollback ready" value={center.totals.rollbackReady} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <ModerationRoutesPanel routes={center.moderationRoutes} />
          <LicenseEvidencePanel submissions={center.licenseEvidenceQueue} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {center.submissions.length ? (
            center.submissions
              .slice(0, 8)
              .map((submission) => (
                <CreatorSubmissionCard
                  key={submission.id}
                  submission={submission}
                />
              ))
          ) : (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              No marketplace creator submissions are available yet.
            </p>
          )}
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Creator operations next actions
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

function CreatorSubmissionCard({
  submission,
}: {
  submission: MarketplaceCreatorSubmission;
}) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={submission.status} />
            <h3 className="truncate text-sm font-semibold">
              {submission.templateName}
            </h3>
            <Badge variant="outline">v{submission.version}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {submission.creatorDetail}
          </p>
        </div>
        <Badge variant={statusVariants[submission.status]}>
          {submission.score}/100
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{submission.submissionStage}</Badge>
        <Badge variant="outline">{submission.marketplaceLabel}</Badge>
        <Badge variant="outline">{submission.approvalLabel}</Badge>
        <Badge variant="outline">{submission.stats.views} views</Badge>
        <Badge variant="outline">{submission.stats.uses} installs</Badge>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <TrustTile trust={submission.trustScore} />
        <LicenseTile evidence={submission.licenseEvidence} />
        <RollbackTile plan={submission.rollbackPlan} />
      </div>

      <div className="mt-3 rounded-md border border-border bg-background p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold">
              <Route className="h-3.5 w-3.5 text-muted-foreground" />
              {submission.moderationRoute.queueLabel}
            </p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {submission.moderationRoute.reason}
            </p>
          </div>
          <Badge
            variant={priorityVariants[submission.moderationRoute.priority]}
          >
            {submission.moderationRoute.priority}
          </Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <History className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {submission.versionTimeline[0]?.title ?? "No version events"} -{" "}
            {submission.versionTimeline[0]
              ? formatDate(submission.versionTimeline[0].createdAt)
              : "n/a"}
          </span>
        </p>
        <Button asChild size="sm" variant="outline">
          <a
            download={submission.operationPacket.fileName}
            href={submission.operationPacket.dataUrl}
          >
            <Download className="h-3.5 w-3.5" />
            Packet
          </a>
        </Button>
      </div>
    </article>
  );
}

function TrustTile({ trust }: { trust: MarketplaceCreatorTrustScore }) {
  return (
    <HealthTile
      icon={<UserCheck className="h-3.5 w-3.5" />}
      label="Trust"
      status={trust.status}
      score={trust.score}
      detail={trust.signals[0] ?? trust.summary}
    />
  );
}

function LicenseTile({
  evidence,
}: {
  evidence: MarketplaceCreatorLicenseEvidence;
}) {
  return (
    <HealthTile
      icon={<ShieldCheck className="h-3.5 w-3.5" />}
      label="License"
      status={evidence.status}
      score={evidence.score}
      detail={evidence.gaps[0] ?? evidence.evidence[0] ?? evidence.summary}
    />
  );
}

function RollbackTile({ plan }: { plan: MarketplaceCreatorRollbackPlan }) {
  return (
    <HealthTile
      icon={<RotateCcw className="h-3.5 w-3.5" />}
      label="Rollback"
      status={plan.status}
      score={plan.score}
      detail={plan.summary}
    />
  );
}

function HealthTile({
  detail,
  icon,
  label,
  score,
  status,
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  score: number;
  status: MarketplaceCreatorOperationStatus;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-medium">
          {icon}
          {label}
        </p>
        <Badge variant={statusVariants[status]}>{score}</Badge>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function ModerationRoutesPanel({
  routes,
}: {
  routes: MarketplaceCreatorModerationRoute[];
}) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start gap-2">
        <Route className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div>
          <h3 className="text-sm font-semibold">Moderation routing</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Open creator submissions by queue, priority, owner, and due date.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {routes.length ? (
          routes.slice(0, 5).map((route) => (
            <div
              key={route.id}
              className="rounded-md border border-border bg-background p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {route.templateName}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {route.reason}
                  </p>
                </div>
                <Badge variant={priorityVariants[route.priority]}>
                  {route.priority}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant={statusVariants[route.status]}>
                  {statusLabels[route.status]}
                </Badge>
                <Badge variant="outline">{route.queueLabel}</Badge>
                <Badge variant="outline">{route.owner}</Badge>
                {route.dueAt ? (
                  <Badge variant="outline">Due {formatDate(route.dueAt)}</Badge>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
            No open marketplace creator moderation routes.
          </p>
        )}
      </div>
    </section>
  );
}

function LicenseEvidencePanel({
  submissions,
}: {
  submissions: MarketplaceCreatorSubmission[];
}) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start gap-2">
        <FileCheck2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div>
          <h3 className="text-sm font-semibold">Licensing evidence</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Submissions missing source, rights, attribution, or approval proof.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {submissions.length ? (
          submissions.slice(0, 5).map((submission) => (
            <div
              key={`${submission.id}-license`}
              className="rounded-md border border-border bg-background p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {submission.templateName}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {submission.licenseEvidence.gaps[0] ??
                      submission.licenseEvidence.summary}
                  </p>
                </div>
                <Badge
                  variant={statusVariants[submission.licenseEvidence.status]}
                >
                  {submission.licenseEvidence.score}
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
            All visible creator submissions have licensing evidence.
          </p>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Store className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: MarketplaceCreatorOperationStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
