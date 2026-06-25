"use client";

import {
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
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
import {
  approvalStatusLabels,
  getApprovalStatusBadgeVariant,
} from "@/features/review/approval-status";
import type {
  ApprovalQueueItem,
  ReviewAssignmentFilter,
  ReviewerCollaborationCenter,
  ReviewerCollaborationCheck,
  ReviewerCollaborationStatus,
  ReviewOnlyLinkSummary,
} from "@/features/review/reviewer-collaboration-center";
import { cn } from "@/lib/utils";

type ReviewerCollaborationCenterPanelProps = {
  center: ReviewerCollaborationCenter;
};

const statusLabels: Record<ReviewerCollaborationStatus, string> = {
  ready: "Ready",
  attention: "Attention",
  blocked: "Blocked",
};

const statusVariants: Record<
  ReviewerCollaborationStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  attention: "outline",
  blocked: "destructive",
};

export function ReviewerCollaborationCenterPanel({
  center,
}: ReviewerCollaborationCenterPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5" />
              Reviewer collaboration
            </CardTitle>
            <CardDescription>
              Review-only links, approval queues, assignments, and workspace
              reporting.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4">
          <Metric label="Review links" value={center.totals.reviewOnlyLinks} />
          <Metric label="Approval queue" value={center.totals.approvalQueue} />
          <Metric label="Open tasks" value={center.totals.openTasks} />
          <Metric label="Overdue" value={center.totals.overdueTasks} />
        </div>

        <Tabs defaultValue="report" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="report">Report</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value="report">
            <section className="grid gap-3 xl:grid-cols-2">
              <PanelBlock title="Workspace checks">
                {center.checks.map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </PanelBlock>
              <PanelBlock title="Recent review activity">
                {center.recentReviewAudit.length ? (
                  center.recentReviewAudit.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-md border border-border bg-muted/20 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {formatAuditAction(log.action)}
                        </Badge>
                        <p className="truncate text-sm font-medium">
                          {log.summary}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {log.actorEmail ?? "Workspace"} /{" "}
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState text="No recent review or approval activity has been recorded." />
                )}
              </PanelBlock>
            </section>
          </TabsContent>

          <TabsContent value="links">
            <section className="grid gap-3 xl:grid-cols-2">
              <PanelBlock title="Review-only links">
                {center.reviewOnlyLinks.length ? (
                  center.reviewOnlyLinks.map((link) => (
                    <ReviewOnlyLinkRow key={link.projectId} link={link} />
                  ))
                ) : (
                  <EmptyState text="No viewer or commenter review links are active yet." />
                )}
              </PanelBlock>
              <PanelBlock title="Editable share risks">
                {center.editableShareRisks.length ? (
                  center.editableShareRisks.map((risk) => (
                    <div
                      key={risk.projectId}
                      className="rounded-md border border-border bg-muted/20 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {risk.projectName}
                        </p>
                        <Badge variant="destructive">
                          {risk.permissionLabel}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Replace editable links with commenter links for review.
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState text="No editable share links are exposed for review work." />
                )}
              </PanelBlock>
            </section>
          </TabsContent>

          <TabsContent value="queue">
            <PanelBlock title="Approval queue">
              {center.approvalQueue.length ? (
                center.approvalQueue.map((item) => (
                  <ApprovalQueueRow key={item.id} item={item} />
                ))
              ) : (
                <EmptyState text="No project, template, or campaign approval items are waiting." />
              )}
            </PanelBlock>
          </TabsContent>

          <TabsContent value="assignments">
            <PanelBlock title="Assignment filters">
              {center.assignmentFilters.length ? (
                center.assignmentFilters.map((filter) => (
                  <AssignmentFilterRow
                    key={filter.assigneeName}
                    filter={filter}
                  />
                ))
              ) : (
                <EmptyState text="No review task assignments have been created yet." />
              )}
            </PanelBlock>
          </TabsContent>
        </Tabs>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Next review actions
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

function ReviewOnlyLinkRow({ link }: { link: ReviewOnlyLinkSummary }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{link.projectName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {link.canComment ? "Comment review link" : "View-only review link"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Badge variant="outline">{link.roleLabel}</Badge>
          <Badge variant="secondary">{link.permissionLabel}</Badge>
        </div>
      </div>
      <Button asChild variant="ghost" size="sm" className="mt-3">
        <Link href={`/editor/${link.projectId}`}>
          <ExternalLink className="h-4 w-4" />
          Open design
        </Link>
      </Button>
    </div>
  );
}

function ApprovalQueueRow({ item }: { item: ApprovalQueueItem }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.subject} / {item.owner}
          </p>
        </div>
        <Badge variant={getApprovalStatusBadgeVariant(item.status)}>
          {approvalStatusLabels[item.status]}
        </Badge>
      </div>
      {item.targetHref ? (
        <Button asChild variant="ghost" size="sm" className="mt-3">
          <Link href={item.targetHref}>
            <ExternalLink className="h-4 w-4" />
            Open
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function AssignmentFilterRow({
  filter,
}: {
  filter: ReviewAssignmentFilter;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium">{filter.assigneeName}</p>
        <Badge variant={filter.overdue ? "destructive" : "outline"}>
          {filter.open} open
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <Metric label="To do" value={filter.todo} compact />
        <Metric label="Progress" value={filter.inProgress} compact />
        <Metric label="Done" value={filter.done} compact />
        <Metric label="Overdue" value={filter.overdue} compact />
      </div>
    </div>
  );
}

function CheckRow({ check }: { check: ReviewerCollaborationCheck }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <StatusIcon status={check.status} />
          <p className="text-sm font-medium">{check.label}</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{check.detail}</p>
      </div>
      <Badge variant={statusVariants[check.status]}>{check.score}/100</Badge>
    </div>
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

function StatusIcon({ status }: { status: ReviewerCollaborationStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "attention",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "attention") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
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
      <p
        className={cn(
          "mt-1 font-semibold",
          compact ? "text-base" : "text-lg",
        )}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
