"use client";

import {
  CheckCircle2,
  CircleAlert,
  Download,
  Plug,
  PlusCircle,
  ShieldCheck,
  SquareTerminal,
  Trash2,
  XCircle,
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
  FirstPartyExtensionManifestReport,
  FirstPartyExtensionRegisteredCommand,
  FirstPartyExtensionRuntimeCenter,
  FirstPartyExtensionRuntimeStatus,
} from "@/features/extensions/first-party-extension-runtime";
import { cn } from "@/lib/utils";

type ServerAction = (formData: FormData) => Promise<void> | void;

type FirstPartyExtensionRuntimePanelProps = {
  center: FirstPartyExtensionRuntimeCenter;
  installExtensionAction: ServerAction;
  removeExtensionAction: ServerAction;
};

const statusLabels: Record<FirstPartyExtensionRuntimeStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  FirstPartyExtensionRuntimeStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function FirstPartyExtensionRuntimePanel({
  center,
  installExtensionAction,
  removeExtensionAction,
}: FirstPartyExtensionRuntimePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              First-party extension runtime
            </CardTitle>
            <CardDescription>
              Safe manifest validation, scoped command registration, permission
              grants, and audit-backed install history.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                download={center.runtimePacket.fileName}
                href={center.runtimePacket.dataUrl}
              >
                <Download className="h-4 w-4" />
                Packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Manifests" value={center.totals.manifests} />
          <Metric label="Installed" value={center.totals.installedExtensions} />
          <Metric label="Blocked" value={center.totals.blockedManifests} />
          <Metric label="Commands" value={center.totals.registeredCommands} />
          <Metric label="Grants" value={center.totals.permissionGrants} />
          <Metric label="Audit trail" value={center.totals.auditTrailEvents} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="grid gap-3">
            {center.manifests.map((report) => (
              <ExtensionManifestCard
                installExtensionAction={installExtensionAction}
                key={report.id}
                removeExtensionAction={removeExtensionAction}
                report={report}
              />
            ))}
          </section>

          <div className="space-y-4">
            <RegistryPanel commands={center.commandRegistry} />
            <AuditTrailPanel center={center} />
          </div>
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CircleAlert className="h-4 w-4 text-muted-foreground" />
              Extension next actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p
                  className="flex gap-2 text-xs text-muted-foreground"
                  key={action}
                >
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
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

function ExtensionManifestCard({
  report,
  installExtensionAction,
  removeExtensionAction,
}: {
  report: FirstPartyExtensionManifestReport;
  installExtensionAction: ServerAction;
  removeExtensionAction: ServerAction;
}) {
  const canInstall =
    report.status !== "blocked" && report.installState !== "installed";
  const canRemove = report.installState === "installed";

  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={report.status} />
            <h3 className="truncate text-sm font-semibold">
              {report.manifest.name}
            </h3>
            <Badge variant={statusVariants[report.status]}>
              {report.score}/100
            </Badge>
            <Badge variant="outline">{report.installState}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {report.manifest.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={installExtensionAction}>
            <input
              name="extensionId"
              type="hidden"
              value={report.manifest.id}
            />
            <Button disabled={!canInstall} size="sm" variant="outline">
              <PlusCircle className="h-4 w-4" />
              Install
            </Button>
          </form>
          <form action={removeExtensionAction}>
            <input
              name="extensionId"
              type="hidden"
              value={report.manifest.id}
            />
            <Button disabled={!canRemove} size="sm" variant="outline">
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <MiniStat label="Version" value={report.manifest.version} />
        <MiniStat label="Commands" value={report.commandCount} />
        <MiniStat label="Permissions" value={report.permissionCount} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <PanelBlock
          badge={`${report.permissionGrants.length} grants`}
          icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
          title="Scoped permissions"
        >
          <div className="grid gap-2">
            {report.permissionGrants.map((grant) => (
              <div
                className="rounded-md border border-border bg-background p-3"
                key={grant.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">{grant.scope}</p>
                  <StatusIcon status={grant.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {grant.detail}
                </p>
              </div>
            ))}
          </div>
        </PanelBlock>

        <PanelBlock
          badge={`${report.issues.length} issues`}
          icon={<CircleAlert className="h-4 w-4 text-muted-foreground" />}
          title="Manifest validation"
        >
          {report.issues.length ? (
            <div className="grid gap-2">
              {report.issues.map((issue) => (
                <div
                  className="rounded-md border border-border bg-background p-3"
                  key={issue.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">{issue.field}</p>
                    <Badge
                      variant={
                        issue.severity === "error" ? "destructive" : "outline"
                      }
                    >
                      {issue.severity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {issue.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyLine>Manifest is signed and scoped.</EmptyLine>
          )}
        </PanelBlock>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{report.nextAction}</p>
    </article>
  );
}

function RegistryPanel({
  commands,
}: {
  commands: FirstPartyExtensionRegisteredCommand[];
}) {
  return (
    <PanelBlock
      badge={`${commands.length} commands`}
      icon={<SquareTerminal className="h-4 w-4 text-muted-foreground" />}
      title="Command registry"
    >
      {commands.length ? (
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-3">
            {commands.map((command) => (
              <div
                className="rounded-md border border-border bg-background p-3"
                key={command.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {command.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {command.extensionName} / {command.surface} /{" "}
                      {command.runMode}
                    </p>
                  </div>
                  <Badge variant="outline">{command.category}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {command.scopedPermissionSummary}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <EmptyLine>Install a valid extension to register commands.</EmptyLine>
      )}
    </PanelBlock>
  );
}

function AuditTrailPanel({
  center,
}: {
  center: FirstPartyExtensionRuntimeCenter;
}) {
  return (
    <PanelBlock
      badge={`${center.auditTrails.length} events`}
      icon={<Plug className="h-4 w-4 text-muted-foreground" />}
      title="Install and remove trail"
    >
      {center.auditTrails.length ? (
        <div className="grid gap-2">
          {center.auditTrails.slice(0, 6).map((trail) => (
            <div
              className="rounded-md border border-border bg-background p-3"
              key={trail.id}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {trail.extensionName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {trail.summary}
                  </p>
                </div>
                <Badge variant="outline">{formatDate(trail.createdAt)}</Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyLine>
          No extension install activity has been recorded yet.
        </EmptyLine>
      )}
    </PanelBlock>
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
    <section className="rounded-md border border-border p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h4>
        <Badge variant="outline">{badge}</Badge>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function StatusIcon({ status }: { status: FirstPartyExtensionRuntimeStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <XCircle className={className} />;

  return <CircleAlert className={className} />;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
