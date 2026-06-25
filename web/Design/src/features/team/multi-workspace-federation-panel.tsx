"use client";

import {
  CheckCircle2,
  CircleAlert,
  Download,
  Network,
  RadioTower,
  ShieldAlert,
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
  MultiWorkspaceCommandPacket,
  MultiWorkspaceFederatedAuditEvent,
  MultiWorkspaceFederatedCommand,
  MultiWorkspaceFederationCenter,
  MultiWorkspaceFederationScope,
  MultiWorkspaceFederationStatus,
} from "@/features/team/multi-workspace-federation";
import { cn } from "@/lib/utils";

type MultiWorkspaceFederationPanelProps = {
  center: MultiWorkspaceFederationCenter;
};

const statusLabels: Record<MultiWorkspaceFederationStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  MultiWorkspaceFederationStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function MultiWorkspaceFederationPanel({
  center,
}: MultiWorkspaceFederationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Multi-workspace command federation
            </CardTitle>
            <CardDescription>
              Federated admin commands, workspace scopes, and audit events for
              managing several workspaces from one operations surface.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-7">
          <Metric label="Workspaces" value={center.totals.workspaces} />
          <Metric
            label="Manageable"
            value={center.totals.manageableWorkspaces}
          />
          <Metric label="Commands" value={center.totals.commands} />
          <Metric label="Blocked" value={center.totals.blockedCommands} />
          <Metric label="Review" value={center.totals.reviewCommands} />
          <Metric label="Audit" value={center.totals.federatedAuditEvents} />
          <Metric label="Packets" value={center.totals.commandPackets} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <WorkspaceScopes scopes={center.scopes} />
            <FederatedCommands commands={center.commands} />
          </section>
          <section className="space-y-4">
            <FederatedAudit events={center.federatedAuditEvents} />
            <CommandPackets packets={center.commandPackets} />
          </section>
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CircleAlert className="h-4 w-4 text-muted-foreground" />
              Next federated admin actions
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

function WorkspaceScopes({
  scopes,
}: {
  scopes: MultiWorkspaceFederationScope[];
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Federated scopes</h3>
        <Badge variant="outline">{scopes.length} scopes</Badge>
      </div>
      <div className="mt-3 grid gap-2 xl:grid-cols-2">
        {scopes.length ? (
          scopes.map((scope) => (
            <div
              key={scope.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={scope.status} />
                    <p className="truncate text-sm font-medium">
                      {scope.workspaceName}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {scope.manageable
                      ? `${scope.role} access can manage workspace commands.`
                      : `${scope.role} access is read-only for federation.`}
                  </p>
                </div>
                <Badge variant={statusVariants[scope.status]}>
                  {statusLabels[scope.status]}
                </Badge>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <Metric label="Members" value={scope.memberCount} compact />
                <Metric label="Admins" value={scope.adminCount} compact />
                <Metric
                  label="Invites"
                  value={scope.pendingInviteCount}
                  compact
                />
                <Metric label="Audit" value={scope.recentAuditCount} compact />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            Create or join a team workspace before federation scopes appear.
          </p>
        )}
      </div>
    </section>
  );
}

function FederatedCommands({
  commands,
}: {
  commands: MultiWorkspaceFederatedCommand[];
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Command queue</h3>
        <Badge variant="outline">{commands.length} commands</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {commands.length ? (
          commands.map((command) => (
            <div
              key={command.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {command.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {command.workspaceName}: {command.detail}
                  </p>
                </div>
                <Badge variant={statusVariants[command.status]}>
                  {statusLabels[command.status]}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">{command.actionLabel}</Badge>
                <Badge variant="outline">
                  {command.target.replace("_", " ")}
                </Badge>
                <Badge variant="outline">
                  {command.auditLogIds.length} audit refs
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            Manageable workspaces have admin coverage, invite hygiene, and audit
            visibility.
          </p>
        )}
      </div>
    </section>
  );
}

function FederatedAudit({
  events,
}: {
  events: MultiWorkspaceFederatedAuditEvent[];
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Federated audit stream</h3>
        <Badge variant="outline">{events.length} events</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {events.length ? (
          events.slice(0, 8).map((event) => (
            <div
              key={`${event.source}-${event.id}`}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {event.summary}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.workspaceName} / {event.actorEmail ?? "Workspace"}
                  </p>
                </div>
                <Badge variant="outline">{event.source}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {event.action} / {event.targetType}
                {event.targetId ? ` / ${event.targetId}` : ""}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            No team workspace audit events are available for federation yet.
          </p>
        )}
      </div>
    </section>
  );
}

function CommandPackets({
  packets,
}: {
  packets: MultiWorkspaceCommandPacket[];
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Command packets</h3>
        <Badge variant="outline">{packets.length} packets</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {packets.length ? (
          packets.map((packet) => (
            <div
              key={packet.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {packet.workspaceName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {packet.commandIds.length} commands /{" "}
                    {packet.auditEventIds.length} audit events
                  </p>
                </div>
                <Badge variant={statusVariants[packet.status]}>
                  {statusLabels[packet.status]}
                </Badge>
              </div>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <a
                  href={packet.download.href}
                  download={packet.download.fileName}
                >
                  <Download className="h-4 w-4" />
                  Packet
                </a>
              </Button>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            Command packets appear when a workspace has federated admin work.
          </p>
        )}
      </div>
    </section>
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
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <UsersRound className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={cn("mt-1 font-semibold", compact ? "text-sm" : "text-lg")}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: MultiWorkspaceFederationStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <ShieldAlert className={className} />;

  return <RadioTower className={className} />;
}
