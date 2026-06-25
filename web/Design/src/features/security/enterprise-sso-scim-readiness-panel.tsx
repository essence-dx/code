"use client";

import {
  CheckCircle2,
  CircleAlert,
  Download,
  Fingerprint,
  KeyRound,
  ShieldAlert,
  UsersRound,
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
  EnterpriseSsoScimDomainCapturePlan,
  EnterpriseSsoScimProviderCheck,
  EnterpriseSsoScimReadinessCenter,
  EnterpriseSsoScimRoleMappingPreview,
  EnterpriseSsoScimStatus,
} from "@/features/security/enterprise-sso-scim-readiness";
import { cn } from "@/lib/utils";

type EnterpriseSsoScimReadinessPanelProps = {
  center: EnterpriseSsoScimReadinessCenter;
};

const statusLabels: Record<EnterpriseSsoScimStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  EnterpriseSsoScimStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function EnterpriseSsoScimReadinessPanel({
  center,
}: EnterpriseSsoScimReadinessPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Enterprise SSO and SCIM readiness
            </CardTitle>
            <CardDescription>
              Provider checks, role mapping previews, domain capture planning,
              and audit-safe rollout packets.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Workspaces" value={center.totals.workspaces} />
          <Metric label="Checks" value={center.totals.providerChecks} />
          <Metric label="Blocked" value={center.totals.blockedChecks} />
          <Metric label="Review" value={center.totals.reviewChecks} />
          <Metric label="Mappings" value={center.totals.roleMappings} />
          <Metric label="Domains" value={center.totals.domainPlans} />
          <Metric label="Captured" value={center.totals.capturedDomains} />
          <Metric label="Invites" value={center.totals.pendingInvites} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <ProviderChecks checks={center.providerChecks} />
            <RoleMappings mappings={center.roleMappingPreviews} />
          </section>
          <section className="space-y-4">
            <DomainPlans plans={center.domainCapturePlans} />
            <RolloutPacket center={center} />
          </section>
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CircleAlert className="h-4 w-4 text-muted-foreground" />
              Next identity rollout actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p key={action} className="text-xs text-muted-foreground">
                  {action}
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ProviderChecks({
  checks,
}: {
  checks: EnterpriseSsoScimProviderCheck[];
}) {
  return (
    <PanelBlock title="Provider checks" badge={`${checks.length} checks`}>
      {checks.map((check) => (
        <div
          key={check.id}
          className="rounded-md border border-border bg-muted/20 p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <StatusIcon status={check.status} />
                <p className="truncate text-sm font-medium">{check.label}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {check.detail}
              </p>
            </div>
            <Badge variant={statusVariants[check.status]}>
              {check.score}/100
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {check.evidence.slice(0, 4).map((item) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </PanelBlock>
  );
}

function RoleMappings({
  mappings,
}: {
  mappings: EnterpriseSsoScimRoleMappingPreview[];
}) {
  return (
    <PanelBlock title="Role mapping previews" badge={`${mappings.length} maps`}>
      {mappings.length ? (
        mappings.map((mapping) => (
          <div
            key={mapping.id}
            className="rounded-md border border-border bg-muted/20 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-muted-foreground" />
                  <p className="truncate text-sm font-medium">
                    {mapping.providerGroup}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {mapping.detail}
                </p>
              </div>
              <Badge variant={statusVariants[mapping.status]}>
                {mapping.workspaceRole}
              </Badge>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Metric label="Members" value={mapping.localMemberCount} compact />
              <Metric
                label="Invites"
                value={mapping.pendingInviteCount}
                compact
              />
              <Metric label="Audit" value={mapping.auditLogIds.length} compact />
            </div>
          </div>
        ))
      ) : (
        <EmptyState text="No provider group mappings are available yet." />
      )}
    </PanelBlock>
  );
}

function DomainPlans({
  plans,
}: {
  plans: EnterpriseSsoScimDomainCapturePlan[];
}) {
  return (
    <PanelBlock title="Domain capture plans" badge={`${plans.length} domains`}>
      {plans.map((plan) => (
        <div
          key={plan.id}
          className="rounded-md border border-border bg-muted/20 p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <StatusIcon status={plan.status} />
                <p className="truncate text-sm font-medium">{plan.domain}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan.memberCount} members / {plan.pendingInviteCount} pending
                invites
              </p>
            </div>
            <Badge variant={statusVariants[plan.status]}>
              {statusLabels[plan.status]}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant={plan.configuredInProvider ? "secondary" : "outline"}>
              {plan.configuredInProvider ? "Provider" : "Provider gap"}
            </Badge>
            <Badge variant={plan.verifiedAccountDomain ? "secondary" : "outline"}>
              {plan.verifiedAccountDomain ? "Verified" : "Unverified"}
            </Badge>
            {plan.personalDomain ? (
              <Badge variant="outline">Personal domain</Badge>
            ) : null}
          </div>
          {plan.requiredSteps.length ? (
            <div className="mt-2 grid gap-1">
              {plan.requiredSteps.slice(0, 3).map((step) => (
                <p key={step} className="text-xs text-muted-foreground">
                  {step}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </PanelBlock>
  );
}

function RolloutPacket({
  center,
}: {
  center: EnterpriseSsoScimReadinessCenter;
}) {
  return (
    <PanelBlock title="Rollout packet" badge={statusLabels[center.status]}>
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <p className="truncate text-sm font-medium">
                SSO and SCIM rollout packet
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {center.totals.providerChecks} checks /{" "}
              {center.totals.roleMappings} mappings /{" "}
              {center.totals.domainPlans} domains.
            </p>
          </div>
          <Badge variant={statusVariants[center.rolloutPacket.status]}>
            {statusLabels[center.rolloutPacket.status]}
          </Badge>
        </div>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <a
            href={center.rolloutPacket.download.href}
            download={center.rolloutPacket.download.fileName}
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

function StatusIcon({ status }: { status: EnterpriseSsoScimStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <ShieldAlert className={className} />;

  return <CircleAlert className={className} />;
}
