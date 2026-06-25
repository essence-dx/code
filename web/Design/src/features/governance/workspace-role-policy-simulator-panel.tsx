"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  ShieldCheck,
  ShieldQuestion,
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
  WorkspaceRolePolicyPrincipal,
  WorkspaceRolePolicyScenario,
  WorkspaceRolePolicySimulator,
  WorkspaceRolePolicyStatus,
} from "@/features/governance/workspace-role-policy-simulator";
import { cn } from "@/lib/utils";

type WorkspaceRolePolicySimulatorPanelProps = {
  simulator: WorkspaceRolePolicySimulator;
};

const statusLabels: Record<WorkspaceRolePolicyStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  WorkspaceRolePolicyStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function WorkspaceRolePolicySimulatorPanel({
  simulator,
}: WorkspaceRolePolicySimulatorPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldQuestion className="h-5 w-5" />
              Role policy simulator
            </CardTitle>
            <CardDescription>
              Effective permissions, share-link previews, denial explanations,
              and audit-safe remediation plans.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[simulator.status]}>
              {simulator.score}/100 {statusLabels[simulator.status]}
            </Badge>
            <Badge variant="outline">
              {simulator.totals.simulatedPrincipals.toLocaleString()} principals
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Workspaces" value={simulator.totals.workspaces} />
          <Metric label="Share links" value={simulator.totals.shareLinks} />
          <Metric label="Blocked" value={simulator.totals.blockedPolicies} />
          <Metric label="Review" value={simulator.totals.reviewPolicies} />
          <Metric label="Plans" value={simulator.totals.remediationPlans} />
          <Metric label="Score" value={simulator.score} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {simulator.workspaceScenarios.slice(0, 4).map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </div>

        {simulator.shareLinkPreviews.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Share-link previews</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Public and editable links interpreted as concrete principals.
                </p>
              </div>
              <Badge variant="outline">
                {simulator.shareLinkPreviews.length.toLocaleString()}
              </Badge>
            </div>
            <div className="mt-3 grid gap-2 xl:grid-cols-2">
              {simulator.shareLinkPreviews.slice(0, 6).map((preview) => (
                <div
                  key={preview.id}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {preview.projectName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {preview.permissionLabel}
                      </p>
                    </div>
                    <Badge variant={statusVariants[preview.risk]}>
                      {statusLabels[preview.risk]}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <PermissionBadges
                      principal={{
                        effectivePermissions: preview.effectivePermissions,
                      }}
                    />
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                    >
                      <a href={preview.href}>
                        Open
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                  {preview.denialExplanations.length ? (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {preview.denialExplanations[0]}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {simulator.remediationPlans.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Remediation plans
            </div>
            <div className="mt-2 grid gap-2">
              {simulator.remediationPlans.slice(0, 5).map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{plan.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {plan.detail}
                      </p>
                    </div>
                    <Badge variant={statusVariants[plan.severity]}>
                      {statusLabels[plan.severity]}
                    </Badge>
                  </div>
                  <div className="mt-2 grid gap-1">
                    {plan.actions.slice(0, 3).map((action) => (
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
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ScenarioCard({ scenario }: { scenario: WorkspaceRolePolicyScenario }) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{scenario.workspaceName}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Current viewer role: {scenario.viewerRole}
          </p>
        </div>
        <Badge variant={statusVariants[scenario.status]}>
          {statusLabels[scenario.status]}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {scenario.principals.slice(0, 5).map((principal) => (
          <PrincipalRow key={principal.id} principal={principal} />
        ))}
      </div>
      {scenario.auditContext.length ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Latest audit: {scenario.auditContext[0]?.summary}
        </p>
      ) : null}
    </section>
  );
}

function PrincipalRow({
  principal,
}: {
  principal: WorkspaceRolePolicyPrincipal;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <StatusIcon status={principal.status} />
            <span className="truncate">{principal.label}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {principal.roleLabel}
          </p>
        </div>
        <Badge variant={statusVariants[principal.status]}>
          {statusLabels[principal.status]}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <PermissionBadges principal={principal} />
      </div>
      {principal.denialExplanations.length ? (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          {principal.denialExplanations[0]}
        </p>
      ) : null}
    </div>
  );
}

function PermissionBadges({
  principal,
}: {
  principal: Pick<WorkspaceRolePolicyPrincipal, "effectivePermissions">;
}) {
  const permissions = principal.effectivePermissions;

  return (
    <>
      <Badge variant={permissions.canViewProjects ? "secondary" : "outline"}>
        View
      </Badge>
      <Badge variant={permissions.canCommentProjects ? "secondary" : "outline"}>
        Comment
      </Badge>
      <Badge variant={permissions.canEditProjects ? "secondary" : "outline"}>
        Edit
      </Badge>
      <Badge variant={permissions.canManageWorkspace ? "secondary" : "outline"}>
        Manage
      </Badge>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <UsersRound className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: WorkspaceRolePolicyStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <ShieldQuestion className={className} />;

  return <CircleAlert className={className} />;
}
