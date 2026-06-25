import Link from "next/link";
import { AtSign, CheckCircle2, GitCompareArrows, Inbox, MessageCircleCheck, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectCollaborationInbox, ProjectCollaborationInboxKind, ProjectCollaborationInboxNotification, ProjectCollaborationInboxSeverity } from "@/features/projects/project-collaboration-inbox";

function iconForKind(kind: ProjectCollaborationInboxKind) {
  switch (kind) {
    case "mention":
      return <AtSign className="size-4" />;
    case "remote-conflict":
      return <GitCompareArrows className="size-4" />;
    case "resolved-comment":
      return <MessageCircleCheck className="size-4" />;
    case "review-request":
      return <ShieldQuestion className="size-4" />;
  }
}

function severityVariant(severity: ProjectCollaborationInboxSeverity) {
  return severity === "urgent" ? "destructive" : severity === "warning" ? "secondary" : "outline";
}

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function InboxRow({ notification }: { notification: ProjectCollaborationInboxNotification }) {
  return (
    <div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{iconForKind(notification.kind)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{notification.title}</p>
            <p className="truncate text-xs text-muted-foreground">{notification.projectName}</p>
          </div>
          <Badge className="rounded-md text-[10px]" variant={severityVariant(notification.severity)}>
            {notification.severity}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{notification.message}</p>
      </div>
      <div className="flex flex-col gap-3 md:items-end">
        <Badge className="w-fit rounded-md" variant="outline">
          {notification.count}
        </Badge>
        <div className="text-right text-xs text-muted-foreground">
          <p>{notification.actionLabel}</p>
          <p>{formatDate(notification.updatedAt)}</p>
        </div>
        <Link className={buttonVariants({ className: "w-fit gap-2", size: "sm", variant: "outline" })} href={`/?projectId=${encodeURIComponent(notification.projectId)}`}>
          Open scene
        </Link>
      </div>
    </div>
  );
}

export function ProjectCollaborationInboxPanel({ inbox }: { inbox: ProjectCollaborationInbox }) {
  const topNotifications = inbox.notifications.slice(0, 8);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="size-4" />
              Collaboration inbox
            </CardTitle>
            <CardDescription>Review requests, mentions, remote collaboration changes, and resolved comment activity.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={inbox.summary.urgentCount > 0 ? "destructive" : "outline"}>
              {inbox.summary.urgentCount} urgent
            </Badge>
            <Badge className="rounded-md" variant="secondary">
              {inbox.summary.warningCount} warnings
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {inbox.summary.totalCount} total
            </Badge>
          </div>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          <span className="rounded-md bg-muted px-2 py-1">{inbox.summary.reviewRequestCount} review requests</span>
          <span className="rounded-md bg-muted px-2 py-1">{inbox.summary.mentionCount} mentions</span>
          <span className="rounded-md bg-muted px-2 py-1">{inbox.summary.remoteConflictCount} remote reviews</span>
          <span className="rounded-md bg-muted px-2 py-1">{inbox.summary.resolvedCommentCount} resolved</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {topNotifications.length > 0 ? (
          topNotifications.map((notification) => <InboxRow key={notification.id} notification={notification} />)
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-500" />
            No active collaboration inbox items.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
