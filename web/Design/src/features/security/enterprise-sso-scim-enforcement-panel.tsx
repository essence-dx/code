"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  KeyRound,
  ShieldAlert,
  UserCheck,
  UsersRound,
} from "lucide-react";

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
  EnterpriseScimGroupRoleSync,
  EnterpriseScimProvisioningDecision,
  EnterpriseSsoScimEnforcementCenter,
} from "@/features/security/enterprise-sso-scim-enforcement";
import type { EnterpriseSsoScimStatus } from "@/features/security/enterprise-sso-scim-readiness";
import { cn } from "@/lib/utils";

type EnterpriseSsoScimEnforcementPanelProps = {
  center: EnterpriseSsoScimEnforcementCenter;
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

export function EnterpriseSsoScimEnforcementPanel({
  center,
}: EnterpriseSsoScimEnforcementPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              SSO and SCIM enforcement
            </CardTitle>
            <CardDescription>
              Live SCIM provisioning decisions, group-to-role sync,
              deprovisioning holds, and admin rollout evidence.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                download={center.adminRolloutEvidence.download.fileName}
                href={center.adminRolloutEvidence.download.href}
              >
                <Download className="h-4 w-4" />
                Evidence
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-7">
          <Metric label="Groups" value={center.totals.groupRoleSyncs} />
          <Metric label="Mapped" value={center.totals.mappedGroups} />
          <Metric label="Unmanaged" value={center.totals.unmanagedGroups} />
          <Metric label="Decisions" value={center.totals.decisions} />
          <Metric label="Ready" value={center.totals.readyDecisions} />
          <Metric label="Blocked" value={center.totals.blockedDecisions} />
          <Metric label="Held" value={center.totals.heldDeprovisioning} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-md border border-border p-4">
            <SectionHeader
              title="Group role sync"
              badge={`${center.groupRoleSyncs.length} mappings`}
              icon={UsersRound}
            />
            <div className="mt-3 grid gap-2">
              {center.groupRoleSyncs.length ? (
                center.groupRoleSyncs.map((sync) => (
                  <GroupSyncCard key={sync.id} sync={sync} />
                ))
              ) : (
                <EmptyState text="No provider group mappings are configured yet." />
              )}
            </div>
          </section>

          <section className="rounded-md border border-border p-4">
            <SectionHeader
              title="Provisioning decisions"
              badge={`${center.provisioningDecisions.length} decisions`}
              icon={UserCheck}
            />
            <div className="mt-3 grid gap-2">
              {center.provisioningDecisions.length ? (
                center.provisioningDecisions.map((decision) => (
                  <DecisionCard key={decision.id} decision={decision} />
                ))
              ) : (
                <EmptyState text="No SCIM user payloads have been received for preview." />
              )}
            </div>
          </section>
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Enforcement actions
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

function GroupSyncCard({ sync }: { sync: EnterpriseScimGroupRoleSync }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <StatusIcon status={sync.status} />
            <span className="truncate">{sync.providerGroup}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{sync.detail}</p>
        </div>
        <Badge variant={statusVariants[sync.status]}>
          {sync.workspaceRole}
        </Badge>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <Metric label="Desired" value={sync.desiredMemberCount} compact />
        <Metric label="Local" value={sync.localMemberCount} compact />
        <Metric label="Invites" value={sync.pendingInviteCount} compact />
      </div>
    </div>
  );
}

function DecisionCard({
  decision,
}: {
  decision: EnterpriseScimProvisioningDecision;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <StatusIcon status={decision.status} />
            <span className="truncate">{decision.email}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {decision.workspaceName ?? "No workspace"} /{" "}
            {decision.desiredRole ?? "unmapped"}
          </p>
        </div>
        <Badge variant={statusVariants[decision.status]}>
          {decision.action}
        </Badge>
      </div>
      {decision.blockers.length ? (
        <div className="mt-2 grid gap-1">
          {decision.blockers.slice(0, 2).map((blocker) => (
            <p key={blocker} className="text-xs text-muted-foreground">
              {blocker}
            </p>
          ))}
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline">
          {decision.currentRole ?? "new"} to {decision.desiredRole ?? "none"}
        </Badge>
        <Badge variant="outline">{decision.providerGroups.length} groups</Badge>
        <Badge variant="outline">
          {decision.auditLogIds.length} audit logs
        </Badge>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  badge,
  icon: Icon,
}: {
  title: string;
  badge: string;
  icon: typeof UsersRound;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h3>
      <Badge variant="outline">{badge}</Badge>
    </div>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-semibold", compact ? "text-sm" : "text-lg")}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
      {text}
    </p>
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
