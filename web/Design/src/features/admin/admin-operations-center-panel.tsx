"use client";

import {
  Archive,
  CheckCircle2,
  CircleAlert,
  Gauge,
  Globe2,
  MailWarning,
  RefreshCcw,
  ShieldAlert,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatAuditAction } from "@/features/audit/workspace-audit";
import type {
  AdminBulkActionPlan,
  AdminModerationQueueItem,
  AdminOperationAreaReport,
  AdminOperationsCenter,
  AdminOperationStatus,
} from "@/features/admin/admin-operations-center";

type ServerAction = (formData: FormData) => Promise<void> | void;

type AdminOperationsCenterPanelProps = {
  center: AdminOperationsCenter;
  deleteDuplicateAssetsAction: ServerAction;
  verifyDomainAction: ServerAction;
  attachDomainAction: ServerAction;
  refreshDomainAction: ServerAction;
};

const statusLabels: Record<AdminOperationStatus, string> = {
  ready: "Ready",
  attention: "Attention",
  blocked: "Blocked",
};

const statusVariants: Record<
  AdminOperationStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  attention: "outline",
  blocked: "destructive",
};

export function AdminOperationsCenterPanel({
  center,
  deleteDuplicateAssetsAction,
  verifyDomainAction,
  attachDomainAction,
  refreshDomainAction,
}: AdminOperationsCenterPanelProps) {
  const defaultArea = center.areas[0]?.area ?? "templates";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Admin operations
            </CardTitle>
            <CardDescription>
              Moderation queues, bulk actions, and audit-safe activity trails.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4">
          <Metric label="Queue" value={center.totals.queueItems} />
          <Metric label="High severity" value={center.totals.highSeverity} />
          <Metric
            label="Bulk actions"
            value={center.totals.availableBulkActions}
          />
          <Metric label="Audit events" value={center.totals.auditEvents} />
        </div>

        <Tabs defaultValue={defaultArea} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            {center.areas.map((area) => (
              <TabsTrigger key={area.area} value={area.area}>
                {area.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {center.areas.map((area) => (
            <TabsContent key={area.area} value={area.area}>
              <AreaView
                area={area}
                deleteDuplicateAssetsAction={deleteDuplicateAssetsAction}
                verifyDomainAction={verifyDomainAction}
                attachDomainAction={attachDomainAction}
                refreshDomainAction={refreshDomainAction}
              />
            </TabsContent>
          ))}
        </Tabs>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              Next admin actions
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

function AreaView({
  area,
  deleteDuplicateAssetsAction,
  verifyDomainAction,
  attachDomainAction,
  refreshDomainAction,
}: {
  area: AdminOperationAreaReport;
  deleteDuplicateAssetsAction: ServerAction;
  verifyDomainAction: ServerAction;
  attachDomainAction: ServerAction;
  refreshDomainAction: ServerAction;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-md border border-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">{area.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {area.description}
            </p>
          </div>
          <Badge variant={statusVariants[area.status]}>
            {area.score}/100 {statusLabels[area.status]}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <PanelBlock title="Moderation queue">
          {area.queue.length ? (
            area.queue.slice(0, 8).map((item) => (
              <QueueRow
                key={item.id}
                item={item}
                verifyDomainAction={verifyDomainAction}
                attachDomainAction={attachDomainAction}
                refreshDomainAction={refreshDomainAction}
              />
            ))
          ) : (
            <EmptyState text="No moderation items are waiting in this area." />
          )}
        </PanelBlock>

        <PanelBlock title="Bulk actions">
          {area.bulkActions.map((action) => (
            <BulkActionRow
              key={action.id}
              action={action}
              deleteDuplicateAssetsAction={deleteDuplicateAssetsAction}
            />
          ))}
        </PanelBlock>

        <PanelBlock title="Audit trail">
          {area.auditTrail.length ? (
            area.auditTrail.map((log) => (
              <div
                key={log.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{formatAuditAction(log.action)}</Badge>
                  <p className="truncate text-sm font-medium">{log.summary}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {log.actorEmail ?? "Workspace"} /{" "}
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <EmptyState text="No audit-safe activity trail exists for this area yet." />
          )}
        </PanelBlock>
      </div>
    </section>
  );
}

function QueueRow({
  item,
  verifyDomainAction,
  attachDomainAction,
  refreshDomainAction,
}: {
  item: AdminModerationQueueItem;
  verifyDomainAction: ServerAction;
  attachDomainAction: ServerAction;
  refreshDomainAction: ServerAction;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Badge variant={statusVariants[item.status]}>
            {statusLabels[item.status]}
          </Badge>
          <Badge variant={item.severity === "high" ? "destructive" : "outline"}>
            {item.severity}
          </Badge>
        </div>
      </div>
      {item.area === "domains" && item.targetId ? (
        <DomainActions
          domainId={item.targetId}
          verifyDomainAction={verifyDomainAction}
          attachDomainAction={attachDomainAction}
          refreshDomainAction={refreshDomainAction}
        />
      ) : null}
    </div>
  );
}

function DomainActions({
  domainId,
  verifyDomainAction,
  attachDomainAction,
  refreshDomainAction,
}: {
  domainId: string;
  verifyDomainAction: ServerAction;
  attachDomainAction: ServerAction;
  refreshDomainAction: ServerAction;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <form action={verifyDomainAction}>
        <input type="hidden" name="domainId" value={domainId} />
        <Button type="submit" variant="outline" size="sm">
          <CheckCircle2 className="h-4 w-4" />
          Verify
        </Button>
      </form>
      <form action={attachDomainAction}>
        <input type="hidden" name="domainId" value={domainId} />
        <Button type="submit" variant="outline" size="sm">
          <Globe2 className="h-4 w-4" />
          Attach
        </Button>
      </form>
      <form action={refreshDomainAction}>
        <input type="hidden" name="domainId" value={domainId} />
        <Button type="submit" variant="ghost" size="sm">
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </form>
    </div>
  );
}

function BulkActionRow({
  action,
  deleteDuplicateAssetsAction,
}: {
  action: AdminBulkActionPlan;
  deleteDuplicateAssetsAction: ServerAction;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{action.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{action.detail}</p>
        </div>
        <Badge variant={action.available ? "secondary" : "outline"}>
          {action.targetCount.toLocaleString()}
        </Badge>
      </div>
      <BulkActionControl
        action={action}
        deleteDuplicateAssetsAction={deleteDuplicateAssetsAction}
      />
    </div>
  );
}

function BulkActionControl({
  action,
  deleteDuplicateAssetsAction,
}: {
  action: AdminBulkActionPlan;
  deleteDuplicateAssetsAction: ServerAction;
}) {
  if (action.actionKind === "asset-duplicate-cleanup") {
    return (
      <form action={deleteDuplicateAssetsAction} className="mt-3">
        <input type="hidden" name="scope" value="all" />
        <Button type="submit" variant="outline" size="sm" disabled={!action.available}>
          <Trash2 className="h-4 w-4" />
          Delete duplicates
        </Button>
      </form>
    );
  }

  const Icon =
    action.area === "templates"
      ? Archive
      : action.area === "email"
        ? MailWarning
        : action.area === "exports"
          ? RefreshCcw
          : CircleAlert;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="mt-3"
      disabled
    >
      <Icon className="h-4 w-4" />
      {action.available ? "Use queue below" : "No safe bulk action"}
    </Button>
  );
}

function PanelBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
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
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
